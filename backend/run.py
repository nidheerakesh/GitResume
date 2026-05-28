import uvicorn
import os

if __name__ == "__main__":
    # Ensure we run from this directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("🚀 Starting GitResume API on http://localhost:5000...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)
