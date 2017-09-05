# TUI Beds NFC Hackathon App

> This app will allow you to scan, test and write NFC tags, broadcasting the messages to allow you to create an application for our cruise ships

## Instructions / Setup
- This app can be installed onto any Android phone
- The app can be configured to set the `Sensor ID` for the phone, eg 'Engine Room' or 'Cruise Lounge' etc
- You have to be connected to the internet / wifi / 3g
- Any tags scanned will be broadcast to a channel that you have subscribe (listen) to
- For instructions on how to subscribe, read the [PubNub docs](https://www.pubnub.com/docs). There are SDK for [Python](https://www.pubnub.com/docs/python/pubnub-python-sdk), [Java](https://www.pubnub.com/docs/java-se-java/pubnub-java-sdk), [Javascript](https://www.pubnub.com/docs/web-javascript/pubnub-javascript-sdk), [Node.js](https://www.pubnub.com/docs/nodejs-javascript/pubnub-javascript-sdk) and many others

### Quick Start Summary
- Install libraries
- Initialise PubNub with:
-- Subscribe key - Will be provided on the day (You will not need the publish key)
-- Unique ID - Put any text, this is just to ensure that we don't go over the free limitations of the service on the day
- Subscribe to a channel - Will be provided on the day (eg, This is like a specific chat room)
- Add a listener for receiving all the messages on the channel - You can then do something will these messages

### Message format
```sh
{"sensor":"$EG_SENSOR_LOCATION","tag":"$EG_PERSONS_NAME"}
```
eg:
```js
{"sensor":"Engine Room","tag":"Jon Snow"}
```
```js
{"sensor":"Cruise Lounge","tag":"Daenerys Targaryen"}
```
_Note: This will be a string and you will need to [parse](https://docs.python.org/2/library/json.html) or decode this._

## Features

| Page | Features |
| ------ | ------ |
| **Header** | Top right hand corner displays connection status with servers |
| **Scan** | Front page |
| **Logs** | All messages from all devices, eg, an small example application  |
| **Config** | Amend the PubNub settings |
| **Test** | Configure and send a test message without scanning a tag |
| **Edit** | Read and write a real NFC tag without broadcasting the result |

### Ideas
tbc

### Tools used for this app
- **[React](https://facebook.github.io/react/)** - A great javascript library for building user interfaces. Facebook open source
- **[React Native](https://facebook.github.io/react-native/)** - A framework for building native apps ontop of react
- **[Native Base](https://nativebase.io/)** - A library of UI components for react native
- **[Expo](https://expo.io/)** - A quick-start development tool with instant and wirelss debugging for react-native
- **[PubNub](https://www.pubnub.com/)** - (Free) Publish subscribe service. I was going to write one from scratch but decided against it
- **[Visual Studio Code](https://code.visualstudio.com/)** - A clean and simplified IDE that I use use for Python & Javascript. Like sublime text
- **[Android Studio, AVD (Android Virtual Devices)](https://developer.android.com/studio/index.html)** - I only use this for the SDK, command line and device emulation, not as an IDE
- **[React Navigation](https://reactnavigation.org/)** - A router and nativation library for react. I didn't use it, I may add it in
- **[Redux](http://redux.js.org/)** - A state container (manage actions and presentation state) for react. I didn't use it, I may add it in
- **[CodePush](https://microsoft.github.io/code-push/)** - Allows app to auto-update without prompting for store updates