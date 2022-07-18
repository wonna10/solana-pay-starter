import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
    clusterApiUrl,
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import products from "./products.json";

// Make sure you replace this with your wallet address!
// const sellerAddress = '4M7PFMUj72KvBAsVUpN8QDGbHyp3Z8gYKc3EiLqZLD61'
// const sellerPublicKey = new PublicKey(sellerAddress);

const createTransfer = async (req, res) => {
    try {
        // Extract the transaction data from the request body
        const { sender, amount, receiver, orderID } = req.body;

        const receiverPublicKey = new PublicKey(receiver);
        // If we don't have something we need, stop!
        if (!sender) {
            return res.status(400).json({
                message: "Missing sender address",
            });
        }

        if (!amount) {
            return res.status(400).json({
                message: "Missing amount ID",
            });
        }

        if (!receiver) {
            return res.status(400).json({
                message: "Missing receiver address",
            });
        }

        if (!orderID) {
            return res.status(400).json({
                message: "Missing Order ID",
            });
        }

        // Convert our price to the correct format
        const bigAmount = BigNumber(amount);
        const senderPublicKey = new PublicKey(sender);
        const network = WalletAdapterNetwork.Devnet;
        const endpoint = clusterApiUrl(network);
        const connection = new Connection(endpoint);

        // A blockhash is sort of like an ID for a block. It lets you identify each block.
        const { blockhash } = await connection.getLatestBlockhash("finalized");

        // The first two things we need - a recent block ID 
        // and the public key of the fee payer 
        const tx = new Transaction({
            recentBlockhash: blockhash,
            feePayer: senderPublicKey,
        });

        // This is the "action" that the transaction will take
        // We're just going to transfer some SOL
        const transferInstruction = SystemProgram.transfer({
            fromPubkey: senderPublicKey,
            // Lamports are the smallest unit of SOL, like Gwei with Ethereum
            lamports: bigAmount.multipliedBy(LAMPORTS_PER_SOL).toNumber(),
            toPubkey: receiverPublicKey,
        });

        // We're adding more instructions to the transaction
        transferInstruction.keys.push({
            // We'll use our OrderId to find this transaction later
            pubkey: new PublicKey(orderID),
            isSigner: false,
            isWritable: false,
        });

        tx.add(transferInstruction);

        // Formatting our transaction
        const serializedTransaction = tx.serialize({
            requireAllSignatures: false,
        });
        const base64 = serializedTransaction.toString("base64");

        res.status(200).json({
            transaction: base64,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: "error creating tx" });
        return;
    }
}

export default function handler(req, res) {
    if (req.method === "POST") {
        createTransfer(req, res);
    } else {
        res.status(405).end();
    }
}