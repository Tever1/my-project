# Published game content

`game-content.json` is created by the disk/save button in the local admin panel.
It is the runtime catalog for general and themed Quiz questions and Who Am I
characters. Drafts and pre-save backups are under ignored `data/`.

Until the first save, the application uses the original TypeScript banks.
Publishing does not rewrite those fallback banks or change an active game queue.
The JSON catalog is ordinary project content and may be versioned in Git.
