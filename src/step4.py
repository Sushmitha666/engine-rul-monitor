import pandas as pd

cols = ["unit", "cycle", "set1", "set2", "set3"] + [f"s{i}" for i in range(1, 22)]
train = pd.read_csv("data/train_FD001.txt", sep=r"\s+", header=None, names=cols)

# RUL = cycles left before failure, capped at 125
last_cycle = train.groupby("unit")["cycle"].transform("max")
train["RUL"] = (last_cycle - train["cycle"]).clip(upper=125)

print(train.shape)
print(train[["unit", "cycle", "RUL"]].head())
print(train[["unit", "cycle", "RUL"]].tail())
