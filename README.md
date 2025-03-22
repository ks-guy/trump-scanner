# Trump Quote & Document Scanner

A comprehensive system for collecting, analyzing, and verifying quotes and documents from various sources.

## Version
Current Version: 0.3.0

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/trump-scanner-3.git
cd trump-scanner-3
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your actual API keys and configuration values
   - Never commit the `.env` file to version control

4. Initialize the database:
```bash
node src/database/init.js
```

5. Run the application:
```bash
npm start
```

## Environment Variables

Required environment variables (see `.env.example` for full list):
- `DB_HOST`: Database host
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `SCRAPEOPS_API_KEY`: API key for ScrapeOps service

## Security Notes

- Never commit API keys or sensitive credentials to version control
- Keep your `.env` file secure and local to your development environment
- Use environment variables for all sensitive configuration
- Regularly rotate API keys and credentials

## Development

- Run tests: `npm test`
- Check code style: `npm run lint`
- Build for production: `npm run build`

## License

[Your chosen license]

## Contributing

[Your contribution guidelines] 