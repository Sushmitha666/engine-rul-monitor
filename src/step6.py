import pandas as pd

cols = ["unit", "cycle", "set1", "set2", "set3"] + [f"s{i}" for i in range(1, 22)]
train = pd.read_csv("data/train_FD001.txt", sep=r"\s+", header=None, names=cols)

last_cycle = train.groupby("unit")["cycle"].transform("max")
train["RUL"] = (last_cycle - train["cycle"]).clip(upper=125)

sensors = [c for c in cols[5:] if train[c].std() > 1e-3]
WIN = 15

g = train.groupby("unit")[sensors]
mean = g.transform(lambda x: x.rolling(WIN, min_periods=1).mean()).add_suffix("_mean")
std = g.transform(lambda x: x.rolling(WIN, min_periods=1).std()).fillna(0).add_suffix("_std")

X = pd.concat([train[["cycle"] + sensors], mean, std], axis=1)
y = train["RUL"]

print("Features:", X.shape[1], "| Rows:", X.shape[0])
print(X[["s2", "s2_mean", "s2_std"]].head(3))
