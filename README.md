# Boun

How to 'boun' your TCB web app.

## Quick Setup

1. `$ mkdir [project-name] && cd $_`
2. `$ boun setup`
3. Edit your `package.json`.
4. Edit `server/modules.js` and `server/pages.js` to suit your needs
5. `$ npm install`
6. `$ boun deps`
7. `$ npm install`
8. `$ boun config`
9. Edit all config files in `server/config`.
10. `$ boun templates`
11. `$ boun create-roles`
12. `$ boun create-user user@email.com password`
13. Run `$ tcb-gulp` to start the project

## boun setup

Essentially copies all files from boun/files and initializes a
Git repository.

## boun deps

Collects dependencies from all hats listed in PWD/server/modules.js.

## boun config

Copies configuration files from Epiphany and all hats listen in
PWD/server/modules.js

## boun templates

Populates gulpconfig.js with all found template directories, which is
once again template directories for hats in modules.js.

## boun create-roles

If no arguments are passed it creates the two roles 'member' and 'admin'.

## boun create-user

Creates a user. By default with 'admin' role.

## boun change-password

Changes password for a user.
