import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  canonical?: string;
  structuredData?: object;
}

export function SEO({
  title = "Noah Berman — Colorado-Based Pilot, Founder & Builder | Aviation & Technology",
  description = "Commercial pilot, bilingual entrepreneur, and founder based in Colorado. Building Freedom Aviation, The Language School platform, and innovative aviation technology solutions.",
  keywords = "Noah Berman, Colorado pilot, aviation Colorado, commercial pilot, Freedom Aviation, flight instructor Colorado, bilingual entrepreneur, aviation technology, aircraft management Colorado",
  image = "https://noahiberman.com/og-image.png",
  type = "website",
  canonical,
  structuredData,
}: SEOProps) {
  const location = useLocation();
  const currentUrl = `https://noahiberman.com${location.pathname}`;
  const canonicalUrl = canonical || currentUrl;

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${property}"]`);
      
      if (element) {
        element.setAttribute('content', content);
      } else {
        element = document.createElement('meta');
        element.setAttribute(attribute, property);
        element.setAttribute('content', content);
        document.head.appendChild(element);
      }
    };

    // Update basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Update Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', currentUrl, true);
    updateMetaTag('og:type', type, true);

    // Update Twitter Card tags
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    updateMetaTag('twitter:url', currentUrl);

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonicalUrl);
    } else {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      canonicalLink.setAttribute('href', canonicalUrl);
      document.head.appendChild(canonicalLink);
    }

    // Add structured data if provided
    if (structuredData) {
      let script = document.querySelector('script[data-seo-structured-data]');
      if (script) {
        script.textContent = JSON.stringify(structuredData);
      } else {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-seo-structured-data', 'true');
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
      }
    }
  }, [title, description, keywords, image, type, currentUrl, canonicalUrl, structuredData]);

  return null;
}

