import React, { useEffect, useState, useMemo } from 'react';
import { Keypair, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { InfinitySpin } from 'react-loader-spinner';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createTransfer } from '@solana/pay';
import * as anchor from "@project-serum/anchor";
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
    Program, AnchorProvider, web3
} from '@project-serum/anchor';
import idl from './idl.json';
import {
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
} from "@solana/spl-token";

const { SystemProgram } = web3;

let baseAccount = Keypair.generate();

import kp from './keypair.json'

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
    preflightCommitment: "processed"
}

const TransferToken = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false); // Loading state of all above
    const orderID = useMemo(() => Keypair.generate().publicKey, []); // Public key used to identify the order

    const getProvider = () => {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = new AnchorProvider(
            connection, window.solana, opts.preflightCommitment,
        );
        return provider;
    }

    const sendToken = async () => {
        console.log("Send token is called")
        const mintKey = anchor.web3.Keypair.generate();
        let associatedTokenAccount = undefined;

        const provider = getProvider();
        const program = new Program(idl, programID, provider);

        const mint = async () => {
            // Get anchor's wallet's public key
            const key = provider.wallet.publicKey;
            const keyV2 = new PublicKey("4dvM3EKPjNi6bh4UZQXWrvJGq1MPckitiVisSwoTrfg2")
            // Get the amount of SOL needed to pay rent for our Token Mint
            const lamports = await program.provider.connection.getMinimumBalanceForRentExemption(
                MINT_SIZE
            );

            // Get the ATA for a token and the account that we want to own the ATA (but it might not existing on the SOL network yet)
            associatedTokenAccount = await getAssociatedTokenAddress(
                mintKey.publicKey,
                key
            );

            // Fires a list of instructions
            const mint_tx = new anchor.web3.Transaction().add(
                // Use anchor to create an account from the mint key that we created
                anchor.web3.SystemProgram.createAccount({
                    fromPubkey: key,
                    newAccountPubkey: mintKey.publicKey,
                    space: MINT_SIZE,
                    programId: TOKEN_PROGRAM_ID,
                    lamports,
                }),
                // Fire a transaction to create our mint account that is controlled by our anchor wallet
                createInitializeMintInstruction(
                    mintKey.publicKey, 0, key, key
                ),
                // Create the ATA account that is associated with our mint on our anchor wallet
                createAssociatedTokenAccountInstruction(
                    key, associatedTokenAccount, key, mintKey.publicKey
                )
            );

            // sends and create the transaction
            const res = await provider.sendAndConfirm(mint_tx, [mintKey]);

            console.log(
                await program.provider.connection.getParsedAccountInfo(mintKey.publicKey)
            );

            console.log("Account: ", res);
            console.log("Mint key: ", mintKey.publicKey.toString());
            console.log("User: ", key.toString());

            // Executes our code to mint our token into our specified ATA
            await program.methods.mintToken().accounts({
                mint: mintKey.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                tokenAccount: associatedTokenAccount,
                authority: key,
            }).rpc();
            return true;

            // Get minted token amount on the ATA for our anchor wallet

        };

        // const transfer = async () => {
        //     // Get anchor's wallet's public key
        //     const myWallet = provider.wallet.publicKey;
        //     // Wallet that will receive the token 
        //     const toWallet = anchor.web3.Keypair.generate();
        //     const toWalletV2 = new PublicKey("4dvM3EKPjNi6bh4UZQXWrvJGq1MPckitiVisSwoTrfg2")
        //     // The ATA for a token on the to wallet (but might not exist yet)
        //     const toATA = await getAssociatedTokenAddress(
        //         mintKey.publicKey,
        //         toWalletV2
        //     );

        //     // Fires a list of instructions
        //     const mint_tx = new anchor.web3.Transaction().add(
        //         // Create the ATA account that is associated with our To wallet
        //         createAssociatedTokenAccountInstruction(
        //             myWallet, toATA, toWalletV2, mintKey.publicKey
        //         )
        //     );

        //     // Sends and create the transaction
        //     await provider.sendAndConfirm(mint_tx, []);

        //     // Executes our transfer smart contract 
        //     const tx = await program.methods.transferToken().accounts({
        //         tokenProgram: TOKEN_PROGRAM_ID,
        //         from: associatedTokenAccount,
        //         fromAuthority: myWallet,
        //         to: toATA,
        //     }).rpc();
        //     console.log("transaction:", tx);
        //     // Get minted token amount on the ATA for our anchor wallet

        // };

        const transfer = async () => {
            // Get anchor's wallet's public key
            const myWallet = provider.wallet.publicKey;
            // Wallet that will receive the token 
            const toWallet = anchor.web3.Keypair.generate();
            const toWalletV2 = new PublicKey("4dvM3EKPjNi6bh4UZQXWrvJGq1MPckitiVisSwoTrfg2")
            // The ATA for a token on the to wallet (but might not exist yet)
            const toATA = await getAssociatedTokenAddress(
                mintKey.publicKey,
                toWalletV2
            );

            console.log("Transfer is called")

            // Fires a list of instructions
            const mint_tx = new anchor.web3.Transaction().add(
                // Create the ATA account that is associated with our To wallet
                createAssociatedTokenAccountInstruction(
                    myWallet, toATA, toWalletV2, mintKey.publicKey
                )
            );

            // Sends and create the transaction
            const tx = await provider.sendAndConfirm(mint_tx, []);
            console.log("Approved " + tx);

            // Executes our transfer smart contract 
            const tx_transfer = await program.methods.transferToken().accounts({
                tokenProgram: TOKEN_PROGRAM_ID,
                from: associatedTokenAccount,
                fromAuthority: myWallet,
                to: toATA,
            }).rpc();

            console.log("Hello transfer" + tx_transfer);
        }

        const mintData = await mint();
        console.log("Mint Data:" + mintData)
        if (mintData === true) {
            transfer()
        }

    }

    const renderNotConnectedContainer = () => (
        <div>
            <img src="https://media.giphy.com/media/eSwGh3YK54JKU/giphy.gif" alt="emoji" />

            <div className="button-container">
                <WalletMultiButton className="cta-button connect-wallet-button" />
            </div>
        </div>
    );

    const renderItemBuyContainer = () => (
        <div className="products-container">
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    const receiverId = event.target.receiver.value;
                    const amount = event.target.amount.value;
                    sendToken();
                }}
            >
                <input className='cta-button' style={{ width: "500px", margin: "10px" }} placeholder='Receiver ID' name="receiver" id='receiver' type="text" /> <br />
                <input disabled className='cta-button' style={{ width: "300px", margin: "10px" }} placeholder='Amount' name="amount" id="amount" type="number" step="0.001" /> <br />
                <button className='cta-button' type='submit'>Transfer Token</button>
            </form>
        </div>
    );

    return (
        <div className="App">
            <div className="container">
                <header className="header-container">
                    <p className="header"> 😳 Transfer Token 😈</p>
                </header>

                <main>
                    {/* We only render the connect button if public key doesn't exist */}
                    {publicKey ? renderItemBuyContainer() : renderNotConnectedContainer()}

                </main>

                <div className="footer-container">

                </div>
            </div>
        </div>
    );
};

export default TransferToken;