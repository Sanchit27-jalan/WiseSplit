import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

function Group() {
    const [people, setPeople] = useState([]);
    const [amount, setAmount] = useState('');
    const [checkedPeople, setCheckedPeople] = useState({});
    const [isFullAmountOwed, setIsFullAmountOwed] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [viewMode, setViewMode] = useState('transactions');
    const [summary, setSummary] = useState(null);
    const { id } = useParams();
    const location = useLocation();
    const emailFromLogin = location.state?.email;

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await axios.get("http://localhost:3001/members", {
                    params: {
                        id: id,
                        email: emailFromLogin
                    },
                });
                setPeople(response.data);
            } catch (error) {
                console.error("Error fetching contacts:", error);
            }
        };

        const fetchTransactions = async () => {
            try {
                const response = await axios.get("http://localhost:3001/transactions", {
                    params: {
                        id: id
                    },
                });
                setTransactions(response.data);
            } catch (error) {
                console.error("Error fetching transactions:", error);
            }
        };

        fetchMembers();
        fetchTransactions();

        // Polling for updates every 30 seconds
        const intervalId = setInterval(fetchTransactions, 30000);

        return () => clearInterval(intervalId); // Clear the interval on component unmount
    }, [id, emailFromLogin]);

    const handleAmountChange = (e) => {
        setAmount(e.target.value);
    };

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setCheckedPeople({
            ...checkedPeople,
            [name]: checked,
        });
    };

    const handleFullAmountCheckboxChange = (e) => {
        setIsFullAmountOwed(e.target.checked);
    };

    const handleAddTransaction = async () => {
        const amountFloat = parseFloat(amount);
        if (isNaN(amountFloat)) {
            alert("Please enter a valid amount.");
            return;
        }

        const selectedPeople = Object.keys(checkedPeople).filter((person) => checkedPeople[person]);
        if (selectedPeople.length === 0) {
            alert("Please select at least one person to split the amount.");
            return;
        }

        const transaction = {
            amount: amountFloat,
            isFullAmountOwed,
            selectedPeople,
            group: id,
            towhom: emailFromLogin,
        };

        try {
            await axios.post("http://localhost:3001/transactions", transaction);
            // Fetch updated transactions after adding new transaction
            const response = await axios.get("http://localhost:3001/transactions", {
                params: {
                    id: id
                },
            });
            setTransactions(response.data);

            // Reset form to default state
            setAmount('');
            setCheckedPeople({});
            setIsFullAmountOwed(false);

            // Close the offcanvas
            document.getElementById("offcanvasExample").classList.remove("show");
            document.querySelectorAll(".offcanvas-backdrop").forEach(el => el.remove());
        } catch (error) {
            console.error("Error adding transaction:", error);
        }
    };

    const toggleViewMode = () => {
        const newMode = viewMode === 'transactions' ? 'summary' : 'transactions';
        setViewMode(newMode);
        if (newMode === 'summary') {
            fetchSummary();
        }
    };
    const handleSettle = async (settleEmail, settleAmount) => {
        console.log(settleAmount)
        var flag=0;
        if(settleAmount>0)
        {
            flag=1
        }
        settleAmount=Math.abs(settleAmount)
        try {
            const response = await axios.post("http://localhost:3001/settle", {
                id: id,
                email: emailFromLogin,
                settleEmail: settleEmail,
                amount: settleAmount,
                flag: flag
            });
            console.log("Settlement response:", response.data);
            // Refresh the summary after settling
            fetchSummary();
        } catch (error) {
            console.error("Error settling amount:", error);
            alert("Failed to settle amount. Please try again.");
        }
    };
    const renderTransactions = () => (
        <ul className="list-group">
            {transactions.map((transaction) => {
                let transactionClass = 'transaction-not-involved';
                if (transaction.towhom === emailFromLogin) {
                    transactionClass = 'transaction-owed';
                } else if (transaction.involved.includes(emailFromLogin)) {
                    transactionClass = 'transaction-involved';
                }

                return (
                    <li className={`list-group-item ${transactionClass}`} key={transaction._id}>
                        <span>Amount: {transaction.amount}</span>
                    </li>
                );
            })}
        </ul>
    );

    const fetchSummary = async () => {
        console.log("this called");
        try {
            const response = await axios.post("http://localhost:3001/summary", {
                id: id,
                email: emailFromLogin
            });
            setSummary(response.data);
        } catch (error) {
            console.error("Error fetching summary:", error);
        }
    };
    const renderSummary = () => (
        <div>
            {summary ? (
                <ul className="list-group">
                    {Object.entries(summary.summary).map(([email, amount]) => (
                        <li className="list-group-item d-flex justify-content-between align-items-center" key={email}>
                            <div>
                                <span>{email}: {amount > 0 ? 'You owe ' : 'Owes you '}</span>
                                <span className={amount > 0 ? 'text-danger' : 'text-success'}>
                                    ₹{Math.abs(amount)}
                                </span>
                            </div>
                            <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleSettle(email, (amount))}
                            >
                                Settle
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Loading summary...</p>
            )}
        </div>
    );

    return (
        <>
            <button className="btn btn-primary" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasExample" aria-controls="offcanvasExample">
                Add a transaction
            </button>

            <div className="offcanvas offcanvas-start" tabIndex="-1" id="offcanvasExample" aria-labelledby="offcanvasExampleLabel">
                <div className="offcanvas-header">
                    <h5 className="offcanvas-title" id="offcanvasExampleLabel">Add a transaction</h5>
                    <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div className="offcanvas-body">
                    <div className="mb-3">
                        <label htmlFor="amountInput" className="form-label">Enter amount in rupees</label>
                        <input
                            id="amountInput"
                            className="form-control"
                            type="text"
                            value={amount}
                            onChange={handleAmountChange}
                            aria-label="Enter amount in rupees"
                        />
                    </div>
                    <div className="form-check mb-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            value=""
                            id="flexCheckDefault"
                            checked={isFullAmountOwed}
                            onChange={handleFullAmountCheckboxChange}
                        />
                        <label className="form-check-label" htmlFor="flexCheckDefault">
                            You are owed the full amount
                        </label>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Split between</label>
                        {people.map((contact) => (
                            <div className="form-check" key={contact}>
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`flexCheck-${contact}`}
                                    name={contact}
                                    checked={checkedPeople[contact] || false}
                                    onChange={handleCheckboxChange}
                                />
                                <label className="form-check-label" htmlFor={`flexCheck-${contact}`}>
                                    {contact}
                                </label>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={handleAddTransaction}>
                        Add Transaction
                    </button>
                </div>
            </div>

            <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3>{viewMode === 'transactions' ? 'Transactions' : 'Summary'}</h3>
                    <div className="form-check form-switch">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="flexSwitchCheckDefault"
                            onChange={toggleViewMode}
                            checked={viewMode === 'summary'}
                        />
                        <label className="form-check-label" htmlFor="flexSwitchCheckDefault">
                            {viewMode === 'transactions' ? 'Show Summary' : 'Show Transactions'}
                        </label>
                    </div>
                </div>
                {viewMode === 'transactions' ? renderTransactions() : renderSummary()}
            </div>
        </>
    );
}

export default Group;