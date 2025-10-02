# Android Deployment Instructions

## Prerequisites
- Android Studio installed
- Java Development Kit (JDK) 11 or higher
- Google Play Developer account ($25 one-time fee)

## Steps to Deploy

### 1. Export to GitHub
Click "Export to Github" button in Lovable and git pull the project locally.

### 2. Install Dependencies
```bash
npm install
```

### 3. Add Android Platform
```bash
npx cap add android
```

### 4. Update Android Dependencies
```bash
npx cap update android
```

### 5. Build the Web Assets
```bash
npm run build
```

### 6. Sync to Android
```bash
npx cap sync android
```

### 7. Open in Android Studio
```bash
npx cap open android
```

### 8. Configure App in Android Studio
- Update app icons in `android/app/src/main/res/`
- Update splash screen in `android/app/src/main/res/`
- Configure AndroidManifest.xml for wallet deep-linking:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="solana-wallet" />
</intent-filter>
```

### 9. Generate Signed APK/AAB
1. In Android Studio: Build > Generate Signed Bundle/APK
2. Create or use existing keystore
3. Choose "Android App Bundle" (AAB) for Play Store
4. Select "release" build variant

### 10. Test on Device
```bash
npx cap run android
```

### 11. Upload to Google Play Console
1. Go to play.google.com/console
2. Create new app
3. Upload AAB file
4. Complete store listing (screenshots, description, category)
5. Submit for review

## Important Notes
- Test wallet connections on actual Android device
- Ensure Phantom/Solflare mobile apps are installed for testing
- Use devnet for testing, switch to mainnet for production
