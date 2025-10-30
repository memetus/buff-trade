import { useWallet } from "@solana/wallet-adapter-react";
import nacl from "tweetnacl";
import { useCallback, useMemo } from "react";

export const useSignMessage = () => {
  const { signMessage, publicKey } = useWallet();

  const message = useMemo(() => {
    return `This signature request was initiated by **Buff Trade**.  
Please sign this message to prove wallet ownership.  
This signature will not trigger any blockchain transaction or grant permissions.  

Requested at: ${new Date().toUTCString()}`;
  }, []);

  const verifySign = useCallback(
    async (msg: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => {
      const result = nacl.sign.detached.verify(msg, signature, publicKey);

      return result;
    },
    []
  );

  return {
    message: new TextEncoder().encode(message),
    messageText: message,
    signMessage,
    verifySign,
  };
};
