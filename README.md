<div align="center">
  <img src="/assets/logo.png" alt="Terravue Logo" width="300">
</div>
<p align="center">Terravue is an environmental metrics visualizer of web applications and services.</p>

---

### This repo holds Terravue website to introduce users about Terravue before trying Terravue browser extension or Android app.

## Features

- Provide information about popular links' (such as google.com, ebay.com) carbon emission

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/TerraVueDev/website.git
   cd website
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate TailwindCSS:

   ```bash
   npx @tailwindcss/cli -i ./static/css/input.css -o ./static/css/output.css
   ```

4. Open index.html file manually to access it via browser

## Contributing

Contributions are welcome! Please open issues or submit pull requests.
