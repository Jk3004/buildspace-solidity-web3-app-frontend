import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import truncateEthAddress from 'truncate-eth-address'

import './App.css';
import abi from './WavePortal.json'

// const CONTRACT_ADDRESS = '0x7b682D9B184F75E5788cf7EbB9b8202EeeFCf595';
const CONTRACT_ADDRESS = '0x0c64Da32cAB24517fE9e6Df160459ba3F8f1bd9F';
const CONTRACT_ABI = abi.abi;

const getEthereumObject = () => window.ethereum;

const findMetaMaskAccount = async () => {
    try {
        const ethereum = getEthereumObject();

        if (!ethereum) {
            console.error("Make sure you have Metamask!");
            return null;
        }

        console.log("We have the Ethereum object", ethereum);
        const accounts = await ethereum.request({ method: "eth_accounts" });

        if (accounts.length !== 0) {
            const account = accounts[0];
            console.log("Found an authorized account:", account);
            return account;
        } else {
            console.error("No authorized account found");
            return null;
        }
    }
    catch (error) {
        console.error(error);
        return null;
    }
}

export default function App() {
    const [currentAccount, setCurrentAccount] = useState("");
    const [allWaves, setAllWaves] = useState([]);
    const [message, setMessage] = useState("");

    const connectWallet = async () => {
        try {
            const ethereum = getEthereumObject();

            if (!ethereum) {
                toast.info('No wallet detected');
                return;
            }

            const accounts = await ethereum.request({
                method: "eth_requestAccounts",
            });

            console.log("Connected", accounts[0]);
            setCurrentAccount(accounts[0]);
            toast.success('Wallet Connected');
            getAllWaves();
        }
        catch (error) {
            console.error(error);
            toast.error('User refused connection!');
        }
    }

    useEffect(() => {
        findMetaMaskAccount().then((account) => {
            if (account !== null) {
                setCurrentAccount(account)
            }
        });
        getAllWaves();

        let wavePortalContract;

        const onNewWave = (from, timestamp, message) => {
            console.log("NewWave", from, timestamp, message);
            setAllWaves(prevState => [
                ...prevState,
                {
                    address: from,
                    timestamp: new Date(timestamp * 1000),
                    message: message,
                },
            ]);
        };

        const onWinner = (addr) => {
            console.log("We got a Winner");
            toast.info(`Winner alert: ${truncateEthAddress(addr)}`);
        }

        if (window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            wavePortalContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            wavePortalContract.on("NewWave", onNewWave);
            wavePortalContract.on("Winner", onWinner);
        }

        return () => {
            if (wavePortalContract) {
                wavePortalContract.off("NewWave", onNewWave);
            }
        };
    }, []);

    const wave = async () => {
        console.log("Wave:", message);

        try {
            const { ethereum } = window;

            if (ethereum) {
                const provider = new ethers.providers.Web3Provider(ethereum);
                const signer = await provider.getSigner();
                const wavePortalContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

                let waveCounts = await wavePortalContract.getTotalWaves();
                console.log("Retrieved total wave count =>", waveCounts.toNumber());

                // Wave
                const waveTxn = await wavePortalContract.wave(message, { gasLimit: 300000 })
                console.log("Mining -->", waveTxn.hash);

                await waveTxn.wait();
                console.log("Mined -->", waveTxn.hash);

                waveCounts = await wavePortalContract.getTotalWaves();
                console.log("Retrieved total wave count =>", waveCounts.toNumber());
            }
            else {
                console.log("Ethereum object doesn't exist!");
                toast.warn('Connect to a Wallet!');
            }
        }
        catch (error) {
            console.log(error);
            toast.error('An error occured');
        }
    }

    const getAllWaves = async () => {
        try {
            const { ethereum } = window;
            if (ethereum) {
                const provider = new ethers.providers.Web3Provider(ethereum);
                const signer = provider.getSigner();
                const wavePortalContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

                const waves = await wavePortalContract.getAllWaves();

                let wavesCleaned = [];
                waves.forEach(wave => {
                    wavesCleaned.push({
                        address: wave.waver,
                        timestamp: new Date(wave.timestamp * 1000),
                        message: wave.message
                    });
                });

                setAllWaves(wavesCleaned);
            } else {
                console.log("Ethereum object doesn't exist!");
                toast.info('Connect to a Wallet!');
            }
        } catch (error) {
            console.log(error);
            toast.info('Connect to a Wallet!');
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        await wave();
        setMessage("");
    }

    const convertDate = (dateString) => {
        const date = new Date(dateString);
        return date.getHours() + ":" + (date.getMinutes() > 9 ? date.getMinutes() : '0' + date.getMinutes()) + ", " + date.toDateString();
    }

    function copyToClipboard(e, address) {
        console.log(address);
        navigator.clipboard.writeText(address);
        const el = e.target;
        el.classList.add('copied');

        setTimeout((el) => {
            el.classList.remove('copied');
        }, 1000, el);
    }

    return (
        <div className="mainContainer">
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />

            <div className="dataContainer">
                <div className="header">
                    Hey there! 👋
                </div>

                <div className="bio">
                    <h2 className="me">I'm Jayakrishnan</h2>
                    <h3 className="connect-msg">Connect your Ethereum wallet & message me</h3>
                </div>

                <div>
                    <form className="form" onSubmit={handleSubmit}>
                        <input
                            className="input-message"
                            onChange={(e) => setMessage(e.target.value)}
                            value={message}
                            required
                        />
                        <button className="waveButton">
                            Send 💚
                        </button>
                    </form>
                </div>

                {!currentAccount && (
                    <div className="btn-container">
                        <button className="waveButton" onClick={connectWallet}>
                            Connect Wallet
                        </button>
                    </div>
                )}
            </div>

            <div className="waves-container">
                {allWaves.map((wave, index) => {
                    return (
                        <div
                            key={index}
                            className="waves-card"
                        >
                            <div className="container">
                                <p className="address" onClick={(e) => copyToClipboard(e, wave.address)}>{wave.address}</p>
                                <p className="timestamp">{convertDate(wave.timestamp.toString())}</p>
                                <p className="message">{wave.message}</p>
                            </div>
                        </div>)
                })}
            </div>

            <div className="footer">
                with ❤️ Jk <a href="https://twitter.com/jayakrishnan_04" target="_blank"><i className="fa fa-twitter"></i></a>
            </div>
        </div>
    );
}
