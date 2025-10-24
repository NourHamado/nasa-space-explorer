// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Get DOM elements
const getImageBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');

// Helper: detect YouTube URL and extract ID
function extractYouTubeID(url) {
  if (!url) return null;
  // matches youtu.be/ID or youtube.com/watch?v=ID or youtube.com/embed/ID
  const m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|v\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function getYouTubeEmbedUrl(id) {
  return `https://www.youtube.com/embed/${id}`;
}
function getYouTubeThumbnailUrl(id) {
  // hqdefault is a good fallback; maxres may not exist for all videos
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

// Helper: detect Vimeo URL and extract ID
function extractVimeoID(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  return m ? m[1] : null;
}
function getVimeoEmbedUrl(id) {
  return `https://player.vimeo.com/video/${id}`;
}

// Helper to create a gallery item element
function createGalleryItem(item) {
  // create container
  const card = document.createElement('div');
  card.className = 'gallery-item';

  // media container (image or video)
  const mediaWrap = document.createElement('div');

  if (item.media_type === 'image') {
    // create an image element for images
    const img = document.createElement('img');
    img.src = item.url; // image URL from JSON
    img.alt = item.title || 'NASA image';

    // clicking the thumbnail opens the modal with larger image
    img.style.cursor = 'pointer';
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(item);
    });

    mediaWrap.appendChild(img);
  } else if (item.media_type === 'video') {
    // For videos: prefer thumbnail if available, otherwise embed YouTube/Vimeo when possible,
    // otherwise provide a clear clickable link to the video page.
    const videoUrl = item.url || item.video_url || '';
    const thumb = item.thumbnail_url || null;

    // 1) If a thumbnail URL is provided in the data, show it as a link to the video.
    if (thumb) {
      // show thumbnail (clicking the image opens the modal)
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'thumb-wrap';

      const img = document.createElement('img');
      img.src = thumb;
      img.alt = item.title || 'Video thumbnail';
      img.style.width = '100%';
      img.style.height = '200px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '4px';
      img.style.cursor = 'pointer';

      // clicking the thumbnail opens the modal (larger view + play in modal)
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(item);
      });

      thumbWrap.appendChild(img);

      mediaWrap.appendChild(thumbWrap);

      // provide a small fallback link below the thumbnail
      const linkP = document.createElement('p');
      linkP.innerHTML = `Video: <a href="${videoUrl}" target="_blank" rel="noopener">Open in new tab</a>`;
      mediaWrap.appendChild(linkP);
    } else {
      // 2) Try YouTube embedding
      const ytId = extractYouTubeID(videoUrl);
      if (ytId) {
        const iframe = document.createElement('iframe');
        // autoplay=1 for immediate playback
        iframe.src = `${getYouTubeEmbedUrl(ytId)}?autoplay=1`;
        iframe.width = '100%';
        iframe.height = '300';
        iframe.title = item.title || 'YouTube video';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;

        const wrap = document.createElement('div');
        wrap.className = 'video-iframe';
        wrap.appendChild(iframe);
        mediaWrap.appendChild(wrap);

        const link = document.createElement('p');
        link.innerHTML = `Video: <a href="${videoUrl}" target="_blank" rel="noopener">Open on YouTube</a>`;
        mediaWrap.appendChild(link);
      } else {
        // 3) Try Vimeo embedding
        const vimeoId = extractVimeoID(videoUrl);
        if (vimeoId) {
          const iframe = document.createElement('iframe');
          iframe.src = `${getVimeoEmbedUrl(vimeoId)}?autoplay=1`;
          iframe.width = '100%';
          iframe.height = '300';
          iframe.title = item.title || 'Vimeo video';
          iframe.frameBorder = '0';
          iframe.allow = 'autoplay; fullscreen; picture-in-picture';
          iframe.allowFullscreen = true;

          const wrap = document.createElement('div');
          wrap.className = 'video-iframe';
          wrap.appendChild(iframe);
          mediaWrap.appendChild(wrap);

          const link = document.createElement('p');
          link.innerHTML = `Video: <a href="${videoUrl}" target="_blank" rel="noopener">Open on Vimeo</a>`;
          mediaWrap.appendChild(link);
        } else {
          // 4) Fallback: plain link if we can't embed or show a thumbnail
          const p = document.createElement('p');
          p.innerHTML = `Video: <a href="${videoUrl}" target="_blank" rel="noopener">${videoUrl || 'Open video'}</a>`;
          mediaWrap.appendChild(p);
        }
      }
    }
  } else {
    // unknown media type
    const p = document.createElement('p');
    p.textContent = 'Media type not supported.';
    mediaWrap.appendChild(p);
  }

  // title and date
  const title = document.createElement('p');
  title.innerHTML = `<strong>${item.title || 'Untitled'}</strong>`;
  const date = document.createElement('p');
  date.textContent = item.date || '';

  // append everything to the card
  card.appendChild(mediaWrap);
  card.appendChild(title);
  card.appendChild(date);

  // attach click to open modal
  card.addEventListener('click', () => {
    openModal(item);
  });

  return card;
}

// Render a message in the gallery (used for placeholder or errors)
function renderMessage(text) {
  gallery.innerHTML = '';
  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder';
  placeholder.innerHTML = `<div class="placeholder-icon">🔭</div><p>${text}</p>`;
  gallery.appendChild(placeholder);
}

// Render a short loading message in the gallery
function showLoadingMessage() {
  gallery.innerHTML = '';
  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder';
  placeholder.innerHTML = `<div class="placeholder-icon">🔄</div><p>Loading space photos…</p>`;
  gallery.appendChild(placeholder);
}

// minimum time to show the loading message (ms)
const MIN_LOADING_MS = 1500;

// simple sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch and render APOD items
async function fetchAndRender() {
  try {
    // show loading state
    getImageBtn.textContent = 'Loading...';
    getImageBtn.disabled = true;

    // show a user-facing loading message in the gallery
    showLoadingMessage();

    // record time so we can ensure the loading message is visible briefly
    const start = Date.now();

    const response = await fetch(apodData);
    if (!response.ok) {
      throw new Error(`Network response was not ok (${response.status})`);
    }

    const items = await response.json();

    // ensure the loading message is visible for at least MIN_LOADING_MS
    const elapsed = Date.now() - start;
    if (elapsed < MIN_LOADING_MS) {
      await sleep(MIN_LOADING_MS - elapsed);
    }

    // make sure we have an array
    if (!Array.isArray(items) || items.length === 0) {
      renderMessage('No items found in the fetched data.');
      return;
    }

    // clear gallery and render each item
    gallery.innerHTML = '';
    items.forEach(item => {
      const card = createGalleryItem(item);
      gallery.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    // wait remaining time so loading message doesn't vanish instantly on errors
    const elapsed = Date.now() - start;
    if (elapsed < MIN_LOADING_MS) {
      await sleep(MIN_LOADING_MS - elapsed);
    }
    renderMessage('Failed to fetch data. Please try again later.');
  } finally {
    // restore button state
    getImageBtn.textContent = 'Fetch Space Images';
    getImageBtn.disabled = false;
  }
}

// Attach click handler to the button
getImageBtn.addEventListener('click', () => {
  fetchAndRender();
});

// Get modal elements
const modal = document.getElementById('mediaModal');
const modalMedia = modal.querySelector('.modal-media');
const modalTitle = modal.querySelector('.modal-title');
const modalDate = modal.querySelector('.modal-date');
const modalExplanation = modal.querySelector('.modal-explanation');
const modalCloseButtons = modal.querySelectorAll('[data-modal-close]');

// Open modal and populate content for a given APOD item
function openModal(item) {
  // clear previous content
  modalMedia.innerHTML = '';

  // Title, date, explanation
  modalTitle.textContent = item.title || 'Untitled';
  modalDate.textContent = item.date || '';
  modalExplanation.textContent = item.explanation || '';

  // For images prefer a higher-res url if available, otherwise use item.url
  if (item.media_type === 'image') {
    const img = document.createElement('img');
    img.src = item.hdurl || item.url || '';
    img.alt = item.title || 'NASA image';
    modalMedia.appendChild(img);
  } else if (item.media_type === 'video') {
    // VIDEO: Prefer showing a large thumbnail in the modal with a play button.
    // When the user clicks Play we embed the video in-place inside the modal.
    const videoUrl = item.url || item.video_url || '';

    // Try to get a thumbnail: use provided thumbnail_url or infer a YouTube thumbnail.
    let thumb = item.thumbnail_url || null;
    const ytId = extractYouTubeID(videoUrl);
    if (!thumb && ytId) {
      // create a larger YouTube thumbnail for the modal
      thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }

    if (thumb) {
      // create a wrapper for the modal thumbnail (click to play)
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'thumb-wrap';
      thumbWrap.style.maxWidth = '100%';
      thumbWrap.style.position = 'relative';
      thumbWrap.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.src = thumb;
      img.alt = item.title || 'Video thumbnail';
      img.style.width = '100%';
      img.style.maxHeight = '60vh';
      img.style.objectFit = 'contain';
      img.style.borderRadius = '4px';
      img.style.display = 'block';

      // clicking the modal thumbnail replaces the modal media with the embedded player
      thumbWrap.addEventListener('click', (e) => {
        e.preventDefault();
        embedVideoInPlace(modalMedia, videoUrl, item.title);
      });

      thumbWrap.appendChild(img);
      modalMedia.appendChild(thumbWrap);
    } else {
      // no thumbnail available: embed the player immediately in modal
      embedVideoInPlace(modalMedia, videoUrl, item.title);
    }
  } else {
    const p = document.createElement('p');
    p.textContent = 'Media type not supported.';
    modalMedia.appendChild(p);
  }

  // show modal
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  // trap key handler for Escape
  document.addEventListener('keydown', handleKeyDown);
}

// Close modal and cleanup
function closeModal() {
  // stop any playing media by clearing container
  modalMedia.innerHTML = '';
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', handleKeyDown);
}

// close on Escape
function handleKeyDown(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
}

// wire up close buttons and overlay clicks
modalCloseButtons.forEach(btn => btn.addEventListener('click', closeModal));
modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

// Fun space facts shown on page load (beginner-friendly, short)
const spaceFacts = [
  "Jupiter's Great Red Spot is a storm larger than Earth.",
  "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
  "A day on Venus (rotation) is longer than a year on Venus (orbit).",
  "Neutron stars can spin hundreds of times per second.",
  "Saturn's rings are mostly made of ice and rock particles.",
  "Footprints left on the Moon can remain for millions of years.",
  "There are more stars in the universe than grains of sand on all Earth's beaches.",
  "Voyager 1 is the farthest human-made object from Earth."
];

// Pick a random fact and show it in the Did You Know block
function showRandomFact() {
  const el = document.getElementById('didYouKnowText');
  if (!el) return;
  const idx = Math.floor(Math.random() * spaceFacts.length);
  el.textContent = spaceFacts[idx];
}

// show a random fact as soon as the script runs (script is loaded at end of body)
showRandomFact();