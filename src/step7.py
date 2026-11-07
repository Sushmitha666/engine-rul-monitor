import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_squared_error
from lightgbm import LGBMRegressor

cols = ["unit", "cycle", "set1", "set2", "set3"] + [f"s{i}" for i in range(1, 22)]
train = pd.read_csv("data/train_FD001.txt", sep=r"\s+", header=None, names=cols)

last_cycle = train.groupby("unit")["cycle"].transform("max")
train["RUL"] = (last_cycle - train["cycle"]).clip(upper=125)

sensors = [c for c in cols[5:] if train[c].std() > 1e-3]
g = train.groupby("unit")[sensors]
mean = g.transform(lambda x: x.rolling(15, min_periods=1).mean()).add_suffix("_mean")
std = g.transform(lambda x: x.rolling(15, min_periods=1).std()).fillna(0).add_suffix("_std")
X = pd.concat([train[["cycle"] + sensors], mean, std], axis=1)
y = train["RUL"]

# split by engine: 80 engines train, 20 engines validation
tr, va = next(GroupShuffleSplit(1, test_size=0.2, random_state=42).split(X, y, train["unit"]))
print("Train engines:", train.iloc[tr]["unit"].nunique(), "| Val engines:", train.iloc[va]["unit"].nunique())

rmse = lambda a, b: np.sqrt(mean_squared_error(a, b))

# 1) baseline: always predict the average RUL
base = np.full(len(va), y.iloc[tr].mean())
print("Baseline RMSE:   ", round(rmse(y.iloc[va], base), 2))

# 2) linear regression
lin = LinearRegression().fit(X.iloc[tr], y.iloc[tr])
print("Linear RMSE:     ", round(rmse(y.iloc[va], lin.predict(X.iloc[va])), 2))

# 3) LightGBM
lgb = LGBMRegressor(n_estimators=400, learning_rate=0.03, num_leaves=31,
                    subsample=0.8, colsample_bytree=0.8, random_state=42, verbose=-1)
lgb.fit(X.iloc[tr], y.iloc[tr])
print("LightGBM RMSE:   ", round(rmse(y.iloc[va], lgb.predict(X.iloc[va])), 2))
