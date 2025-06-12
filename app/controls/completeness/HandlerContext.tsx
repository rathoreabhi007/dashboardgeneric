import { createContext } from 'react';

export type HandlerContextType = {
  runNode: (nodeId: string) => Promise<void>;
  resetNodeAndDownstream: (nodeId: string) => Promise<void>;
};

export const HandlerContext = createContext<HandlerContextType>({
  runNode: async () => {},
  resetNodeAndDownstream: async () => {},
}); 