import { createContext, PropsWithChildren } from 'react';

export const PersonalizationContext = createContext<string | null>(null);

export const PersonalizationProvider = (props: PropsWithChildren) => {
  return (
    <PersonalizationContext.Provider value={''}>
      {props.children}
    </PersonalizationContext.Provider>
  );
};
