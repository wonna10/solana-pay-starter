import React, { useEffect, useState, useMemo } from 'react';
import { Keypair, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { InfinitySpin } from 'react-loader-spinner';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createTransfer } from '@solana/pay';


const Payment = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false); // Loading state of all above
    const orderID = useMemo(() => Keypair.generate().publicKey, []); // Public key used to identify the order

    const processTransfer = async (rid, amount) => {
        const order = {
            sender: publicKey.toString(),
            amount: amount,
            receiver: rid,
            orderID: orderID.toString(),
        }
        setLoading(true);
        const txResponse = await fetch("../api/createTransfer", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(order),
        });
        const txData = await txResponse.json();

        // We create a transaction object
        const tx = Transaction.from(Buffer.from(txData.transaction, "base64"));
        console.log("Tx data is", tx);

        // Attempt to send the transaction to the network
        try {
            // Send the transaction to the network
            const txHash = await sendTransaction(tx, connection);
            console.log(`Transaction sent: https://solscan.io/tx/${txHash}?cluster=devnet`);
            // Even though this could fail, we're just going to set it to true for now
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

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
                    console.log("Data", event.target.receiver.value)
                    processTransfer(receiverId, amount);
                }}
            >
                <input className='cta-button' style={{ width: "500px", margin: "10px" }} placeholder='Receiver ID' name="receiver" id='receiver' type="text" /> <br />
                <input className='cta-button' style={{ width: "300px", margin: "10px" }} placeholder='Amount' name="amount" id="amount" type="number" step="0.001" /> <br />
                <button className='cta-button' type='submit'>Transfer</button>
            </form>
        </div>
    );

    return (
        <div className="App">
            <div className="container">
                <header className="header-container">
                    <p className="header"> 😳 Transfer SOL 😈</p>
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

export default Payment;