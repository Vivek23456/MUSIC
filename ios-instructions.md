# iOS Deployment Instructions

## Prerequisites
- macOS with Xcode installed
- Apple Developer account ($99/year)
- CocoaPods installed (`sudo gem install cocoapods`)

## Steps to Deploy

### 1. Export to GitHub
Click "Export to Github" button in Lovable and git pull the project locally.

### 2. Install Dependencies
```bash
npm install
```

### 3. Add iOS Platform
```bash
npx cap add ios
```

### 4. Update iOS Dependencies
```bash
npx cap update ios
cd ios/App
pod install
cd ../..
```

### 5. Build the Web Assets
```bash
npm run build
```

### 6. Sync to iOS
```bash
npx cap sync ios
```

### 7. Open in Xcode
```bash
npx cap open ios
```

### 8. Configure App in Xcode
- Select your development team in Signing & Capabilities
- Update Bundle Identifier to match your Apple Developer account
- Update app icons in Assets.xcassets
- Update splash screen (LaunchScreen.storyboard)

### 9. Configure Info.plist for Wallet Deep-Linking
Add the following to Info.plist:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>phantom</string>
    <string>solflare</string>
</array>
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>melodymintmuse</string>
        </array>
    </dict>
</array>
```

### 10. Test on Device
```bash
npx cap run ios
```
Or press play in Xcode with device selected.

### 11. Create Archive for App Store
1. In Xcode: Product > Archive
2. Once archived, click "Distribute App"
3. Choose "App Store Connect"
4. Follow the upload wizard

### 12. Submit to App Store
1. Go to appstoreconnect.apple.com
2. Create new app
3. Complete app information
4. Upload screenshots (required sizes: 6.5", 5.5")
5. Submit for review

## Important Notes
- Test wallet connections on actual iOS device
- Ensure Phantom/Solflare mobile apps are installed for testing
- Use devnet for testing, switch to mainnet for production
- Apple review process typically takes 1-3 days
- Ensure compliance with Apple's cryptocurrency app guidelines
