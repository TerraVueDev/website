<div align="center">
  <img src="/assets/img/logo.png" alt="Terravue Logo" width="300">
</div>
<p align="center">Terravue is an environmental metrics visualizer of web applications and services.</p>

---

<h1>Terravue Website</h1>
<p>This repo holds Terravue website to introduce to users about Terravue before trying Terravue browser extension or Android app.</p>

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
   npx @tailwindcss/cli -i ./assets/css/input.css -o ./assets/css/output.css --watch
   ```

4. Run localhost server via terminal:

    ```bash
   npm run dev
   ```

## Contributing

Contributions are welcome! Please open issues or submit pull requests.
