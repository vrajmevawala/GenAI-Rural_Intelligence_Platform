import { useState, useEffect } from 'react';
import useLanguage from '@/hooks/useLanguage';

/**
 * A component that translates dynamic text from the database
 * using the backend Azure-powered translation API with local caching.
 */
export default function TranslatedText({ children, className }) {
  const { language, translateData } = useLanguage();
  const [translatedText, setTranslatedText] = useState(children);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // No translation needed for English or empty content
    if (language === 'en' || !children || typeof children !== 'string') {
      setTranslatedText(children);
      return;
    }

    let isMounted = true;

    async function getTranslation() {
      setIsLoading(true);
      try {
        const result = await translateData(children);
        if (isMounted) {
          setTranslatedText(result);
        }
      } catch (err) {
        console.error('Translation error:', err);
        // Fallback to original text on error
        if (isMounted) {
          setTranslatedText(children);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    getTranslation();

    return () => {
      isMounted = false;
    };
  }, [children, language, translateData]);

  if (isLoading) {
    return <span className={`animate-pulse opacity-70 ${className}`}>{translatedText}</span>;
  }

  return <span className={className}>{translatedText}</span>;
}
