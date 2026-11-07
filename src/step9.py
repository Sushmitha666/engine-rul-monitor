import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
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
Xt = feats(test).groupby(test["unit"]).tail(1)

lgb = LGBMRegressor(n_estimators=400, learning_rate=0.03, num_leaves=31,
                    subsample=0.8, colsample_bytree=0.8, random_state=42, verbose=-1)
lgb.fit(X.iloc[tr], y.iloc[tr])
pred = np.clip(lgb.predict(Xt), 0, 125)

THRESHOLD = 30
at_risk = true_rul <= THRESHOLD      # engines truly close to failure
flagged = pred < THRESHOLD           # engines the model alerts on

caught = int((at_risk & flagged).sum())
false_alarms = int((~at_risk & flagged).sum())
missed = int((at_risk & ~flagged).sum())

print("Truly at-risk engines:", int(at_risk.sum()))
print("Engines flagged:      ", int(flagged.sum()))
print("Caught:", caught, "| Missed:", missed, "| False alarms:", false_alarms)
print("Recall:   ", round(100 * caught / max(at_risk.sum(), 1), 1), "%")
print("Precision:", round(100 * caught / max(flagged.sum(), 1), 1), "%")
