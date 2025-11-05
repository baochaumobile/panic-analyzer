#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

def parse_panic(file_path):
    text = Path(file_path).read_text(errors="ignore")
    result = {}

    # Tìm panic string chính
    panic_match = re.search(r'panic\([^)]*\):\s*(.+)', text)
    if panic_match:
        result["panic_summary"] = panic_match.group(1).strip()

    # Tìm loại CPU hoặc thiết bị
    cpu_match = re.search(r'CPU Panic', text)
    result["type"] = "CPU Panic" if cpu_match else "Unknown"

    # Tìm timestamp
    ts = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', text)
    if ts:
        result["timestamp"] = ts.group(1)

    # Giả lập kết quả chẩn đoán
    if "SEP" in text:
        result["suspect"] = "Lỗi liên quan đến Secure Enclave Processor (Face ID)"
    elif "NAND" in text:
        result["suspect"] = "Khả năng cao lỗi bộ nhớ NAND"
    elif "baseband" in text.lower():
        result["suspect"] = "Lỗi modem/baseband"
    else:
        result["suspect"] = "Không xác định – cần kiểm tra thêm"

    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python panic_parser_v2.py paniclog.txt [--json-out file.json]")
        sys.exit(1)

    file_path = sys.argv[1]
    data = parse_panic(file_path)

    # Nếu có tham số xuất JSON
    if "--json-out" in sys.argv:
        out_index = sys.argv.index("--json-out")
        out_file = sys.argv[out_index + 1]
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    else:
        print(json.dumps(data, indent=2, ensure_ascii=False))
