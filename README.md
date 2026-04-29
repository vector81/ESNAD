# Esnad

Esnad is now split into two separate frontends that share the same Firebase content model:

- `public` site for reading, browsing, and sharing published stories
- `editor` site for login, editing, managing categories, and publishing

Both sites live in the same repo and reuse the shared article/category/auth modules under `src/lib`, `src/types`, and `src/contexts`.

## Apps

- Public site root: [sites/public/index.html](/C:/esnad/sites/public/index.html)
- Editor site root: [sites/editor/index.html](/C:/esnad/sites/editor/index.html)

## Scripts

```bash
npm run dev:public
npm run dev:editor
npm run build
npm run build:public
npm run build:editor
npm run deploy:public
npm run deploy:editor
npm run lint
```

`npm run dev` defaults to the public site.

Production deploys should use the explicit target scripts:

- `npm run deploy:public` links the CLI to the `esnad` Vercel project and deploys with `vercel-public.json`
- `npm run deploy:editor` links the CLI to the `esnad-editor` Vercel project and deploys with `vercel-editor.json`

Avoid raw `npx vercel --prod` from the repo root because the active local `.vercel/project.json` link can point at the wrong project.

## Environment

Existing Firebase and Cloudinary variables are still used.

Optional cross-site links:

- `VITE_PUBLIC_SITE_URL` for links from the editor app to the public site
- `VITE_EDITOR_SITE_URL` for links from the public site to the editor app

## Routes

Public site:

- `/`
- `/stories/:slug`
- `/about`
- `/en`
- `/en/stories/:slug`
- `/en/about`

Editor site:

- `/login`
- `/`
- `/stories/new`
- `/stories/:id/edit`
- `/categories`

## Content model

Firestore collections stay the same:

- `articles`
- `categories`

The public site reads published content only. The editor site can create drafts, edit existing stories, manage categories, and publish to the public frontend.
