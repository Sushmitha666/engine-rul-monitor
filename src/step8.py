import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_squared_error
from lightgbm import LGBMRegressor

cols = ["unit", "cycle", "set1", "set2", "set3"] + [f"s{i}" for i in range(1, 22)]
train = pd.read_csv("data/train_FD001.txt", sep=r"\s+", header=None, names=cols)
test = pd.read_csv("data/test_FD001.txt", sep=r"\s+", header=None, names=cols)
true_rul = pd.read_csv("data/RUL_FD001.txt", header=None)[0].values

train["RUL"] = (train.groupby("unit")["cycle"].transform("max") - train["cycle"]).clip(upper=125)
sensors = [c for c in cols[5:] if train[c].std() > 1e-3]

def feats(df):
    g = df.groupby("unit")[sensors]
    mean = g.transform(lambda x: x.rolling(15, min_periods=1).mean()).add_suffix("_mean")
    std = g.transform(lambda x: x.rolling(15, min_periods=1).std()).fillna(0).add_suffix("_std")
    return pd.concat([df[["cycle"] + sensors], mean, std], axis=1)

X, y = feats(train), train["RUL"]
tr, va = next(GroupShuffleSplit(1, test_size=0.2, random_state=42).split(X, y, train["unit"]))

# last cycle of each test engine only
Xt = feats(test).groupby(test["unit"]).tail(1)

rmse = lambda a, b: np.sqrt(mean_squared_error(a, b))

base = np.full(len(Xt), y.iloc[tr].mean())
lin = LinearRegression().fit(X.iloc[tr], y.iloc[tr])
lgb = LGBMRegressor(n_estimators=400, learning_rate=0.03, num_leaves=31,
                    subsample=0.8, colsample_bytree=0.8, random_state=42, verbose=-1)
lgb.fit(X.iloc[tr], y.iloc[tr])

p_lgb = np.clip(lgb.predict(Xt), 0, 125)
r_base = rmse(true_rul, np.clip(base, 0, 125))
r_lin = rmse(true_rul, np.clip(lin.predict(Xt), 0, 125))
r_lgb = rmse(true_rul, p_lgb)

print("TEST Baseline RMSE:", round(r_base, 2))
print("TEST Linear RMSE:  ", round(r_lin, 2))
print("TEST LightGBM RMSE:", round(r_lgb, 2))
print("Improvement vs baseline:", round(100 * (r_base - r_lgb) / r_base, 1), "%")

plt.figure(figsize=(5, 5))
plt.scatter(true_rul, p_lgb, s=14)
plt.plot([0, 140], [0, 140], "r--")
plt.xlabel("True RUL (cycles)")
plt.ylabel("Predicted RUL (cycles)")
plt.title("LightGBM: predicted vs true")
plt.tight_layout()
plt.savefig("pred_vs_true.png", dpi=150)
print("Saved pred_vs_true.png")
