import { useLayoutEffect, useRef, useState } from 'react';

export const usePracticeCardAnimation = (practice) => {
  const practiceCardRef = useRef(null);
  const practiceCardInnerRef = useRef(null);
  const [practiceCardHeight, setPracticeCardHeight] = useState(0);
  const [shouldAnimateCard, setShouldAnimateCard] = useState(false);
  const [isMeasuringHeight, setIsMeasuringHeight] = useState(false);

  useLayoutEffect(() => {
    if (practice && !practice.isRecorded) {
      setIsMeasuringHeight(true);

      const measureHeight = () => {
        if (!practiceCardInnerRef.current) {
          return false;
        }

        const cardElement = practiceCardInnerRef.current;
        const rect = cardElement.getBoundingClientRect();
        const actualHeight = rect.height || cardElement.offsetHeight || cardElement.scrollHeight;

        if (actualHeight <= 0) {
          return false;
        }

        const heightWithMargin = actualHeight + 1;
        setIsMeasuringHeight(false);
        setPracticeCardHeight(0);
        setShouldAnimateCard(false);

        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setPracticeCardHeight(heightWithMargin);
              setShouldAnimateCard(true);
            });
          });
        }, 2000);

        return true;
      };

      if (!measureHeight()) {
        const timers = [];
        [10, 50, 100, 200].forEach((delay) => {
          const timer = setTimeout(() => {
            if (measureHeight()) {
              timers.forEach((scheduledTimer) => clearTimeout(scheduledTimer));
            }
          }, delay);
          timers.push(timer);
        });

        return () => {
          timers.forEach((timer) => clearTimeout(timer));
        };
      }
    } else {
      setPracticeCardHeight(0);
      setShouldAnimateCard(false);
      setIsMeasuringHeight(false);
    }
  }, [practice]);

  return {
    practiceCardRef,
    practiceCardInnerRef,
    practiceCardHeight,
    shouldAnimateCard,
    isMeasuringHeight
  };
};
