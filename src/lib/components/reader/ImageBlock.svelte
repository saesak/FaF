<script lang="ts">
  import type { EmbeddedImage } from '$lib/stores/document';

  export let image: EmbeddedImage;
</script>

<figure class="image-block">
  <img src={image.src} alt={image.alt || 'Document image'} loading="lazy" />
  {#if image.alt}
    <figcaption>{image.alt}</figcaption>
  {/if}
</figure>

<style>
  .image-block {
    margin: 1.5em 0;
    text-align: center;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  figcaption {
    margin-top: 0.5em;
    font-size: 0.875em;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
  }
</style>
