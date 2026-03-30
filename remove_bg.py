from PIL import Image

def make_transparent(image_path, output_path, tolerance=30):
    img = Image.open(image_path)
    img = img.convert("RGBA")
    
    datas = img.getdata()
    
    new_data = []
    
    # We will assume the top-left pixel is the background color
    bg_color = datas[0]
    
    for item in datas:
        # Check if pixel is within the tolerance of the background color
        if (abs(item[0] - bg_color[0]) < tolerance and
            abs(item[1] - bg_color[1]) < tolerance and
            abs(item[2] - bg_color[2]) < tolerance):
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    make_transparent("/Users/4502mp/Desktop/页面design/小灰鼠鼠.png", "/Users/4502mp/Desktop/页面design/assets/pet_transparent.png", tolerance=50)
