import PyPDF2

file_path = r'C:\Users\krish\Downloads\template.pptx (2).pdf'
try:
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = ''
        for page in reader.pages:
            text += page.extract_text() + '\n---PAGE---\n'
    print(text)
except Exception as e:
    print(f"Error reading file: {e}")
