import pandas as pd
import matplotlib.pyplot as plt

cols = ["unit", "cycle", "set1", "set2", "set3"] + [f"s{i}" for i in range(1, 22)]
train = pd.read_csv("data/train_FD001.txt", sep=r"\s+", header=None, names=cols)

sensor_cols = [f"s{i}" for i in range(1, 22)]
stds = train[sensor_cols].std()
print(stds.round(4))

keep = [c for c in sensor_cols if stds[c] > 1e-3]
drop = [c for c in sensor_cols if stds[c] <= 1e-3]
print("\nKeeping", len(keep), ":", keep)
print("Dropping", len(drop), ":", drop)

# plot 4 kept sensors for 3 engines (save for your README)
fig, axes = plt.subplots(2, 2, figsize=(10, 6))
for ax, s in zip(axes.ravel(), keep[:4]):
    for u in [1, 2, 3]:
        d = train[train.unit == u]
        ax.plot(d.cycle, d[s], label=f"engine {u}")
    ax.set_title(s)
axes[0, 0].legend()
plt.tight_layout()
plt.savefig("sensors.png", dpi=150)
print("\nSaved sensors.png")
