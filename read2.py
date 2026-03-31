import PyPDF2
reader = PyPDF2.PdfReader(r'C:\Users\krish\Downloads\template.pptx (2).pdf')
text = '\n'.join([p.extract_text() for p in reader.pages])
with open(r'D:\codehack\ppt_text.txt', 'w', encoding='utf-8') as f:
    f.write(text)
