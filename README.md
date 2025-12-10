# Hank's Tank 2025 - MLB Analytics Frontend

A comprehensive React-based baseball analytics dashboard for the 2025 MLB season. This frontend application provides interactive visualizations and detailed statistics for players, teams, and games.

## 🌐 Live Application

**🔗 [View Live App on Google Cloud Platform](https://hankstank.ue.r.appspot.com/)**

The application is deployed and running on Google Cloud App Engine with continuous deployment.

## 🚀 Features

- **Player Analytics**: Detailed batting and pitching statistics with interactive visualizations
- **Team Performance**: Comprehensive team batting and pitching analytics
- **Live Game Data**: Real-time game scores and strike zone visualizations
- **Advanced Visualizations**: Scatter plot matrices for statistical correlations
- **Historical Data**: Multi-year data comparison (2020-2025)
- **Responsive Design**: Bootstrap-powered responsive interface

## 🛠 Tech Stack

- **React 18.2** - Modern React with hooks and functional components
- **React Router 6** - Client-side routing and navigation
- **Bootstrap 5.3** - Responsive UI framework
- **Recharts 2.12** - Data visualization library
- **React Bootstrap** - Bootstrap components for React

## 📊 Components

### Core Pages
- `HomePage.js` - Landing page with overview
- `PlayerPage.js` - Individual player statistics and analysis
- `TeamPage.js` - Team-level analytics and comparisons

### Analytics Components
- `PlayerBatting.js` - Batting statistics and visualizations
- `PlayerPitching.js` - Pitching analytics and metrics
- `TeamBatting.js` - Team batting performance
- `TeamPitching.js` - Team pitching statistics
- `ScatterPlotMatrix.js` - Advanced statistical correlations

### Game Components
- `GamesToday.js` - Daily game schedules and scores
- `Game.js` - Individual game details
- `BoxScore.js` - Detailed game box scores
- `StrikeZone.js` - Interactive strike zone visualization
- `LiveGameStrikeZone.js` - Real-time strike zone data

### Utility Components
- `Navbar.js` - Navigation bar with routing
- `AssistedAnalysis.js` - AI-powered insights and analysis

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/elijahcraig45/2024_mlb.git
cd 2024_mlb
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view the application

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── styles/          # Component-specific CSS
│   ├── HomePage.js      # Landing page
│   ├── PlayerPage.js    # Player analytics
│   ├── TeamPage.js      # Team analytics
│   └── ...              # Other components
├── App.js               # Main application component
├── App.css              # Global styles
└── index.js             # Application entry point

public/
├── data/                # Static data files
│   ├── 2024_*.json     # 2024 season data
│   └── 2025_*.json     # 2025 season data
├── index.html           # HTML template
└── manifest.json        # PWA manifest
```

## 🔧 Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run eject`
**Note: This is a one-way operation!** Ejects from Create React App

## 📊 Data Sources

- **Static Data**: JSON files in `/public/data/` directory
- **Live Data**: Connected to MLB APIs via backend server
- **News Data**: Aggregated MLB news and Atlanta Braves updates

## 🔗 Backend Integration

This frontend connects to the companion backend API server for:
- Live game data
- Real-time statistics
- Database queries
- External API integrations

Backend repository: [mlb_pi](https://github.com/elijahcraig45/mlb_pi)

## 🎨 Styling

- **Bootstrap 5.3** for responsive grid and components
- **Custom CSS** in `/src/components/styles/`
- **Responsive design** optimized for desktop and mobile

## 📈 Analytics Features

- **Player Comparisons**: Side-by-side statistical analysis
- **Team Performance**: Historical and current season metrics
- **Advanced Metrics**: Sabermetrics and modern baseball analytics
- **Visualizations**: Interactive charts and graphs
- **Strike Zone Analysis**: Pitch location and outcome tracking

## 🚀 Deployment

Built with Create React App, this application can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 About

**Hank's Tank 2025** - Named in honor of Hank Aaron, this analytics platform provides comprehensive baseball insights for the modern game. Built for analysts, fans, and anyone passionate about baseball statistics.

---

⚾ *Play Ball!* ⚾

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
