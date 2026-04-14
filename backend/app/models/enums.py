from enum import Enum

class PaymentMethod(str, Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    KBZPAY = "KBZPAY"
