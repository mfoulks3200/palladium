import { cn } from '@/lib/utils';
import {
  createContext,
  PropsWithChildren,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { OverlayOptions } from 'src/ipc/Overlay';

export const disablePortals = false;
export const disablePortalClearingOnBlur = false;

interface OverlayPortalProps {
  className?: string;
  onBlur?: () => void;
}

export const OverlayPortal = (props: PropsWithChildren<OverlayPortalProps>) => {
  const [portalDomRoot, setPortalDomRoot] = useState<HTMLElement | null>(null);
  const [portalDomWindow, setPortalDomWindow] = useState<Window | null>(null);
  const dummyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!disablePortals && dummyRef.current && !portalDomWindow) {
      const dummyBounds = dummyRef.current.getBoundingClientRect();
      const overlayInfo: OverlayOptions = {
        position: {
          x: dummyBounds.left,
          y: dummyBounds.top,
          height: dummyBounds.height,
          width: dummyBounds.width,
        },
      };
      console.log(overlayInfo);
      const dropdownWindow = window.open(
        '',
        'overlay',
        JSON.stringify(overlayInfo),
      );
      const newPortalDomRoot = dropdownWindow!.document.createElement('div');
      dropdownWindow!.document.body.appendChild(newPortalDomRoot);
      for (const child of window.document.head.children) {
        if (child.tagName.toLowerCase() === 'style') {
          const newStyleTag = dropdownWindow!.document.createElement('style');
          newStyleTag.innerHTML = child.innerHTML;
          dropdownWindow!.document.head.appendChild(newStyleTag);
        }
      }
      const newHtmlElem = dropdownWindow!.document.children[0];
      const currentHtmlElem = document.children[0];
      for (const key of currentHtmlElem.getAttributeNames()) {
        newHtmlElem.setAttribute(key, currentHtmlElem.getAttribute(key) ?? '');
      }
      setPortalDomRoot(newPortalDomRoot);
      setPortalDomWindow(dropdownWindow);
    }
  }, [dummyRef]);

  const destroyOverlay = () => {
    console.log('Destroying overlay');
    if (portalDomWindow) {
      portalDomWindow.close();
    }
    if (props.onBlur) {
      props.onBlur();
    }
    setPortalDomWindow(null);
    setPortalDomRoot(null);
  };

  if (disablePortals && portalDomWindow) {
    destroyOverlay();
  }

  const dummyDiv = (
    <div
      ref={dummyRef}
      className={cn(
        props.className,
        'pointer-events-none bg-transparent select-none',
      )}
    ></div>
  );

  if (disablePortals) {
    return (
      <div className={cn(props.className, 'pointer-events-auto')}>
        <PortalWrapper>{props.children}</PortalWrapper>
      </div>
    );
  }

  if (portalDomRoot && !disablePortals) {
    return (
      <>
        {createPortal(
          <PortalWrapper onUnmount={destroyOverlay}>
            {props.children}
          </PortalWrapper>,
          portalDomRoot,
        )}
        {dummyDiv}
      </>
    );
  } else {
    return <>{dummyDiv}</>;
  }
};

interface PortalWrapperControllerContext {
  closePortal: () => void;
}

export const PortalWrapperControllerContext =
  createContext<PortalWrapperControllerContext>({ closePortal: () => {} });

interface PortalWrapperProps {
  onUnmount?: () => void;
}

const PortalWrapper = (props: PropsWithChildren<PortalWrapperProps>) => {
  const closePortal = useCallback(() => {
    if (props.onUnmount) {
      props.onUnmount();
    }
  }, [props.onUnmount]);

  useEffect(() => {
    return () => {
      closePortal();
    };
  }, []);

  return (
    <PortalWrapperControllerContext.Provider value={{ closePortal }}>
      {props.children}
    </PortalWrapperControllerContext.Provider>
  );
};
