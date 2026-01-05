# API Configuration

## Environment Variables

Create a `.env` file in the frontend root directory with the following variables:

```env
# API Configuration
REACT_APP_API_PROTOCOL=http
REACT_APP_API_HOST=localhost
REACT_APP_API_PORT=8081
```

## Usage

The API configuration is centralized in `src/config/api.js`. This file:

1. Reads environment variables for API configuration
2. Provides default values if environment variables are not set
3. Exports all API endpoints used throughout the application

## Changing the Backend Port

1. **Backend**: Update `server.port` in `application.properties`
2. **Frontend**: Update `REACT_APP_API_PORT` in `.env` file

## Benefits

- Single source of truth for API configuration
- Easy switching between development/production environments
- No more hardcoded URLs throughout the application
- Environment-specific configurations 