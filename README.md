# FaF - Fast as Fuck Speed Reader

An RSVP (Rapid Serial Visual Presentation) speed reading app that displays one word at a time with an ORP (Optimal Recognition Point) focus letter. This technique helps you read faster by eliminating eye movement and reducing subvocalization.

Supports PDF and EPUB files. Built with SvelteKit and deployable as a web app, desktop app (via Tauri), or mobile app (via Capacitor).

## Looks Like This

<img width="494" height="572" alt="image" src="https://github.com/user-attachments/assets/40db38fe-94f3-4f6e-a627-5e4f4f162bec" />

<img width="815" height="804" alt="image" src="https://github.com/user-attachments/assets/0f114488-aeab-4f92-8a7b-767a20012ac5" />


<img width="815" height="804" alt="image" src="https://github.com/user-attachments/assets/c7069e2a-44f2-44df-8024-25df842959d4" />


## Development

Install dependencies:

```sh
npm install
```

Run the development server:

```sh
npm run dev
```

## Build for Web

```sh
npm run build
npm run preview
```

## Build for Desktop (Tauri)

Requires [Tauri prerequisites](https://tauri.app/v2/guides/getting-started/prerequisites) installed.

Development:

```sh
npm run tauri:dev
```

Build distributable:

```sh
npm run tauri:build
```

Outputs are in `src-tauri/target/release/bundle/`.

## Build for Mobile (Capacitor)

Requires [Capacitor prerequisites](https://capacitorjs.com/docs/getting-started/environment-setup) (Android Studio and/or Xcode).

Build the web app first:

```sh
npm run build
```

Sync and open in IDE:

```sh
npx cap sync
npx cap open android  # or: npx cap open ios
```

Build the final APK/IPA from Android Studio or Xcode.
