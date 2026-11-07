"""Turbofan RUL: baseline -> linear -> LightGBM, then maintenance alerts.
Run: python src/train.py   (needs data/train_FD001.txt, test_FD001.txt, RUL_FD001.txt)"""
import json, numpy as np, pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_squared_error
from lightgbm import LGBMRegressor

SEED, CAP, WIN, ALERT = 42, 125, 15, 30
cols = ["unit", "cycle", "set1", "set2", "set3"] + [f"s{i}" for i in range(1, 22)]
rd = lambda f: pd.read_csv(f"data/{f}", sep=r"\s+", header=None, names=cols)
train, test = rd("train_FD001.txt"), rd("test_FD001.txt")
true_rul = pd.read_csv("data/RUL_FD001.txt", header=None)[0].values

train["RUL"] = (train.groupby("unit")["cycle"].transform("max") - train["cycle"]).clip(upper=CAP)
sensors = [c for c in cols[5:] if train[c].std() > 1e-3]  # drop flat sensors

def feats(df):
    g = df.groupby("unit")[sensors]
    mean = g.transform(lambda x: x.rolling(WIN, min_periods=1).mean()).add_suffix("_mean")
    std = g.transform(lambda x: x.rolling(WIN, min_periods=1).std()).fillna(0).add_suffix("_std")
    return pd.concat([df[["cycle"] + sensors], mean, std], axis=1)

X, y = feats(train), train["RUL"]
tr, va = next(GroupShuffleSplit(1, test_size=0.2, random_state=SEED).split(X, y, train["unit"]))  # split by engine

rmse = lambda a, b: float(np.sqrt(mean_squared_error(a, b)))
Xt = feats(test).groupby(test["unit"]).tail(1)  # last cycle of each test engine only
models = {"Mean baseline": None, "Linear regression": LinearRegression(),
          "LightGBM": LGBMRegressor(n_estimators=400, learning_rate=0.03, num_leaves=31,
                                    subsample=0.8, colsample_bytree=0.8, random_state=SEED, verbose=-1)}
results, preds = {}, {}
for name, m in models.items():
    if m is None:
        p_val, p_test = np.full(len(va), y.iloc[tr].mean()), np.full(len(Xt), y.iloc[tr].mean())
    else:
        m.fit(X.iloc[tr], y.iloc[tr]); p_val, p_test = m.predict(X.iloc[va]), m.predict(Xt)
    preds[name] = np.clip(p_test, 0, CAP)
    results[name] = {"val_rmse": rmse(y.iloc[va], p_val), "test_rmse": rmse(true_rul, preds[name])}

best = preds["LightGBM"]
risk, flag = true_rul <= ALERT, best < ALERT
tp = int((risk & flag).sum())
alerts = {"threshold": ALERT, "at_risk": int(risk.sum()), "caught": tp,
          "recall": tp / max(risk.sum(), 1), "false_alarms": int((~risk & flag).sum()),
          "precision": tp / max(flag.sum(), 1)}
base, lgb = results["Mean baseline"]["test_rmse"], results["LightGBM"]["test_rmse"]
results["improvement_vs_baseline_pct"] = 100 * (base - lgb) / base

engines = [{"unit": int(u), "pred_rul": round(float(p), 1), "true_rul": int(t)}
           for u, p, t in zip(test["unit"].unique(), best, true_rul)]
json.dump({"models": results, "alerts": alerts, "engines": engines}, open("web/results.json", "w"), indent=2)
print(json.dumps({"models": results, "alerts": alerts}, indent=2))
