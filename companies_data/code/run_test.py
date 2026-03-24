import subprocess
import sys

# Run for SALE transaction
print("=" * 60)
print("RUNNING FOR SALE TRANSACTION")
print("=" * 60)
process = subprocess.Popen([sys.executable, 'main.py'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
output, _ = process.communicate(input='0\ns\n')
print(output)

# Run for PURCHASE transaction
print("\n\n" + "=" * 60)
print("RUNNING FOR PURCHASE TRANSACTION")
print("=" * 60)
process = subprocess.Popen([sys.executable, 'main.py'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
output, _ = process.communicate(input='0\np\n')
print(output)

print("\n[COMPLETE] Both outputs have been generated in ../files/KAVYA_ENTERPRISES/")
