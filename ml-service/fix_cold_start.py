"""Fix: refit ColdStartHandler on raw data and save to models/"""
import os
from app.data_loader import DataLoader
from app.cold_start_handler import ColdStartHandler

data_dir = os.getenv("ML_DATA_DIR", "./data")
model_dir = os.getenv("ML_MODEL_DIR", "./models")

print("Loading raw data...")
loader = DataLoader()
df = loader.load(data_dir)
print(f"Loaded {len(df)} rows, columns: {list(df.columns)}")

print("Fitting ColdStartHandler...")
# Raw data uses 'round' column, ColdStartHandler expects 'cap_round'
df['cap_round'] = df['round'].map({1: 'I', 2: 'II', 3: 'III'}).fillna(df['round'].astype(str))
handler = ColdStartHandler()
handler.fit(df)
handler.save(f"{model_dir}/cold_start_handler.pkl")
print(f"ColdStartHandler saved with {len(handler.district_mean)} district keys, {len(handler.state_mean)} state keys")
