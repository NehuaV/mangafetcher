# weridscript

<marquee
  direction="down"
  width="100%"
  height="200"
  behavior="alternate"
  style="border:solid">
<marquee behavior="alternate">Small script made for crawling images,<br>compressing them and backing them up</marquee>
</marquee>

## Running the app

### Install bun runtime

Official Link here: https://bun.sh/

Linux/Macos

```bash
curl -fsSL https://bun.sh/install | bash
```

Windows

```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

### To install dependencies:

```bash
bun i
```

### To run:

```bash
bun start
```

## TODOs

1. ~~Fetch from main page not a specific chapter - should return to main page if on chapter~~
2. ~~Crawl~~
   1. ~~Fetch urls of chapters~~
   2. ~~Fetch title from main page~~
   3. ~~Set chapter range~~
3. ~~export to different formats~~
4. ~~Make a generic interface/drivers that allow fetch from different sites~~
5. ~~Use typescript file name as integration baseurl~~
6. ~~Install Playwright browser with bun install~~
