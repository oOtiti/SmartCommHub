#生成密钥
from cryptography.fernet import Fernet

print(Fernet.generate_key().decode())
