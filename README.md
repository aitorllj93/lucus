# lucus

Lucus is a local files server which aims to replace image storage and other types of content in local and development environments. Lucus's ease of use lies in the fact that it serves the file system while respecting the folder structure, and includes functionalities on top of that.

## Features

- Serves complete file systems, including folders
- Auto-generated directory indexes (optional)
- Query parameters for image transformations
- Streaming long files

## Usage

### CLI

You can directly run lucus as a command-line tool

```sh
npx lucus ~/My-folder --port=3210 --directory-listing | npx pino-pretty
```

You can also run it using the provided `Dockerfile` and `docker-compose` configuration

```sh
git clone https://github.com/aitorllj93/lucus.git

# create .env to provide some configuration

docker compose up
```

Here’s the **Lucus Image Transformations documentation** in English, ready to paste into your README.

## Image Transformations

Lucus supports on-the-fly image transformations via URL query parameters.

```
/image.jpg?param=value&param=value
```

Example:

```
/photo.jpg?w=800&h=600&fit=cover&format=webp&q=80
```

## Supported Parameters

### Size

#### `w` / `width`

Output width.

```
?w=800
```

---

#### `h` / `height`

Output height.

```
?h=600
```

---

#### `fit`

Resize mode.

Values:

* `cover`
* `contain`
* `fill`
* `inside`
* `outside`

Example:

```
?w=800&h=600&fit=cover
```

---

### Crop / Position

#### `g` / `gravity`

Controls focal point.

Values:

* `center`
* `north`
* `south`
* `east`
* `west`
* `northeast`
* `northwest`
* `southeast`
* `southwest`
* `entropy`
* `attention`

```
?w=800&h=600&fit=cover&gravity=attention
```

---

### Format

#### `f` / `format`

Convert output format.

Supported:

* `jpeg`
* `png`
* `webp`
* `avif`
* `gif`

```
?format=webp
```

---

### Quality

#### `q` / `quality`

```
?q=80
```

Range:

```
1 - 100
```

---

### Rotation

#### `r` / `rotate`

```
?rotate=90
```

Also:

```
?rotate=180
?rotate=270
```

---

### Flip

#### `flip`

Vertical flip

```
?flip=true
```

---

#### `flop`

Horizontal flip

```
?flop=true
```

---

### Blur

#### `blur`

```
?blur=5
```

Range:

```
0.3 - 1000
```

---

### Sharpen

#### `sharpen`

```
?sharpen=true
```

or

```
?sharpen=2
```

---

### Grayscale

#### `grayscale` / `grey`

```
?grayscale=true
```

---

### Background

Used with transparency or `contain`.

#### `bg` / `background`

```
?background=ffffff
```

Also:

```
?background=000000
?background=transparent
```

---

### Animation

#### `animated`

Allow transforming animated GIFs.

```
?animated=true
```

---

### Combining Parameters

```
/image.jpg
?w=800
&h=600
&fit=cover
&gravity=attention
&format=webp
&q=80
```

---

### Examples

#### Thumbnail

```
?w=300&h=300&fit=cover
```

---

#### Hero Image

```
?w=1920&h=1080&fit=cover&gravity=attention
```

---

#### Optimized WebP

```
?format=webp&q=80
```

---

#### Blur Placeholder

```
?w=20&blur=10
```

---

#### Avatar

```
?w=200&h=200&fit=cover
```

---

### Caching

Transformations are cached automatically:

```
original + query params = cache key
```

Example:

```
/image.jpg?w=800
```

cached separately from:

```
/image.jpg?w=400
```

---

#### Full Example

```
/images/photo.jpg
?w=1200
&h=800
&fit=cover
&gravity=attention
&format=webp
&q=82
&sharpen=true
```

Result:

* resized to 1200×800
* smart crop
* converted to webp
* quality 82
* sharpen applied
* cached automatically
