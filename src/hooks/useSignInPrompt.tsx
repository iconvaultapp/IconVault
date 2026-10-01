import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface SignInPromptContextType {
  open: boolean;
  message: string | undefined;
  prompt: (message?: string) => void;
  close: () => void;
}

const SignInPromptContext = createContext<SignInPromptContextType>({
  open: false,
  message: undefined,
  prompt: () => {},
  close: () => {},
});

export const SignInPromptProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const prompt = useCallback((msg?: string) => {
    setMessage(msg);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <SignInPromptContext.Provider value={{ open, message, prompt, close }}>
      {children}
    </SignInPromptContext.Provider>
  );
};

export const useSignInPrompt = () => useContext(SignInPromptContext);

