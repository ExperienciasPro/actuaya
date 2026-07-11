const Jimp = require('jimp');

async function createIcon() {
  try {
    // Read the full logo (which is dark text for light backgrounds)
    const logo = await Jimp.read('src/assets/icons/logo-full.png');
    
    // Create a 512x512 pure white background
    const bg = new Jimp(512, 512, '#FFFFFF');
    
    // Scale the logo to fit
    logo.scaleToFit(380, 380);
    
    // Calculate position (moved up slightly to leave room for the text below)
    const x = (512 - logo.getWidth()) / 2;
    const y = (512 - logo.getHeight()) / 2 - 30;
    
    // Composite the logo onto the white background
    bg.composite(logo, x, y);
    
    // Load font and add text "COACH"
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    bg.print(font, 0, y + logo.getHeight() + 40, {
      text: 'COACH',
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, 512);
    
    // Save the new perfect square icon
    await bg.writeAsync('src/assets/icons/apple-touch-icon-v3.png');
    console.log('Icon generated successfully!');
  } catch (err) {
    console.error('Error generating icon:', err);
  }
}

createIcon();
