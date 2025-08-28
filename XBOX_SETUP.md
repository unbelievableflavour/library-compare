# Xbox Live Integration Setup

This application uses the professional `@xboxreplay/xboxlive-auth` package for secure Xbox Live authentication. To enable Xbox Live integration, you need to register your own Microsoft Azure application.

## Why Azure App Registration?

- **Security**: OAuth 2.0 flow instead of storing passwords
- **2FA Compatible**: Works with Two-Factor Authentication
- **Professional**: Microsoft's recommended approach
- **User Control**: Users can revoke access anytime

## Setup Steps

### 1. Create Azure Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**

### 2. Configure Application

- **Name**: `Game Library Compare` (or any name you prefer)
- **Supported account types**: Select **"Personal Microsoft accounts only"**
- **Redirect URI**: 
  - Type: **Web**
  - URL: `http://localhost:3000/api/xbox/callback` (development)
  - URL: `https://your-domain.com/api/xbox/callback` (production)

### 3. Get Client ID

After registration:
1. Copy the **Application (client) ID**
2. Set environment variable: `XBOX_CLIENT_ID=your_client_id_here`
3. Restart your development server

### 4. Environment Variables

Create a `.env.local` file in your project root:

```env
XBOX_CLIENT_ID=your_azure_application_client_id_here
```

## Features Enabled

With Xbox Live integration properly configured:

✅ **Secure OAuth Authentication**  
✅ **2FA Support**  
✅ **Professional User Experience**  
✅ **Token Refresh Support**  
✅ **User Privacy Protected**  

## Alternatives

If you don't want to set up Xbox Live integration:

1. **Use Steam Only**: Works perfectly out of the box
2. **Demo Mode**: Try the app with sample data
3. **Add Xbox Later**: You can always add it when needed

## Troubleshooting

### "Xbox Live Setup Required" Error
- You need to complete the Azure app registration
- Make sure `XBOX_CLIENT_ID` environment variable is set
- Restart your development server after setting the variable

### "Redirect URI Mismatch" Error  
- Ensure the redirect URI in Azure exactly matches your app's URL
- Development: `http://localhost:3000/api/xbox/callback`
- Production: `https://your-domain.com/api/xbox/callback`

### "Invalid Client" Error
- Double-check your Client ID is correct
- Make sure the Azure app supports "Personal Microsoft accounts"

## Why This Approach?

Unlike other packages that use demo/hardcoded client IDs, this implementation:

- **Scales to Production**: No artificial limitations
- **Follows Microsoft Guidelines**: Official OAuth 2.0 flow
- **Better Security**: Your own registered application
- **Professional Grade**: Used by real applications

The setup is a one-time process that provides the best possible Xbox Live integration experience.
