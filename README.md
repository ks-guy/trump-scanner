# Trump Scanner

A user-friendly tool that automatically collects and organizes legal documents and quotes related to Donald Trump. Think of it as a digital library that continuously gathers and organizes information from various sources.

## What Does It Do?

1. **Collects Legal Documents**
   - Automatically finds and downloads legal documents from CourtListener
   - Organizes them by date and type
   - Makes them easy to search and read

2. **Gathers Quotes**
   - Finds quotes from various sources
   - Organizes them by topic and date
   - Makes them easy to search

3. **Helps You Find Information**
   - Powerful search to find specific documents or quotes
   - Easy-to-use interface to browse through collected data
   - Keeps track of where information came from

4. **Keeps Everything Safe**
   - Automatically backs up all collected data
   - Makes it easy to restore if needed
   - Keeps your data organized and secure

## How to Use It

### Getting Started (The Easy Way)

1. **Install Required Software**
   - Download and install Docker Desktop from [docker.com](https://docker.com)
   - This is the only software you need to install

2. **Get the Program**
   ```bash
   # Open Command Prompt or Terminal and type:
   git clone https://github.com/yourusername/trump-scanner.git
   cd trump-scanner
   ```

3. **Set Up Your Keys**
   - Copy the example settings file:
     ```bash
     # On Windows:
     copy .env.example .env
     
     # On Mac/Linux:
     cp .env.example .env
     ```
   - Open the `.env` file in any text editor
   - Add your API keys (you'll need to get these from the respective services)

4. **Start the Program**
   ```bash
   # On Windows:
   start.bat
   
   # On Mac/Linux:
   ./start.sh
   ```

### Accessing Your Data

Once running, you can access different parts of the program:

1. **View Your Data**
   - Open your web browser
   - Go to http://localhost:5555
   - This is where you can see all collected documents and quotes

2. **Monitor Progress**
   - Go to http://localhost:3001
   - This shows you how the program is running
   - You can see how many documents have been collected

3. **Search Through Data**
   - Go to http://localhost:5601
   - This lets you search through all collected information

### Common Tasks

1. **Backing Up Your Data**
   ```bash
   # On Windows:
   scripts\backup-db.bat
   
   # On Mac/Linux:
   ./scripts/backup-db.sh
   ```

2. **Restoring From Backup**
   ```bash
   # On Windows:
   scripts\init-db.bat
   
   # On Mac/Linux:
   ./scripts/init-db.sh
   ```

3. **Checking Program Status**
   ```bash
   docker-compose ps
   ```

4. **Viewing Recent Activity**
   ```bash
   docker-compose logs -f
   ```

### Troubleshooting

If something isn't working:

1. **Program Won't Start**
   - Make sure Docker Desktop is running
   - Check that all API keys are set in the `.env` file
   - Try running `docker-compose down` and then start again

2. **Can't Access the Web Interface**
   - Make sure the program is running (`docker-compose ps`)
   - Check that you're using the correct URL
   - Try refreshing your browser

3. **Data Not Being Collected**
   - Check the logs for error messages
   - Verify your API keys are correct
   - Make sure you have an active internet connection

## What You Need to Know

### Required API Keys
You'll need these keys to make the program work:
- ScrapeOps (for web scraping)
- CourtListener (for legal documents)
- Document Cloud (for document processing)
- OpenAI (for text analysis)
- Anthropic (for additional analysis)
- Google (for search capabilities)

### Where Your Data is Stored
- All documents are saved in the `documents` folder
- Database backups are in the `backups` folder
- Logs are kept in the `logs` and `error_logs` folders

### How to Keep Everything Running Smoothly
1. Regularly back up your data
2. Keep your API keys up to date
3. Check the monitoring dashboard for any issues
4. Keep Docker Desktop running

## Need Help?

If you run into any issues:
1. Check the troubleshooting section above
2. Look at the error logs in the `error_logs` folder
3. Create an issue on the GitHub repository
4. Contact the maintainers

## Contributing

Want to help improve the program?
1. Create a GitHub account if you don't have one
2. Fork this repository
3. Make your changes
4. Submit a pull request

## License

This program is free to use and modify under the MIT License. See the LICENSE file for details. 