import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyDseKsHoRE-1iwU8gQCraAkJkYdRNyvqUc", 
    authDomain: "zoology-blood-bank.firebaseapp.com",
    projectId: "zoology-blood-bank",
    storageBucket: "zoology-blood-bank.appspot.com",
    messagingSenderId: "495391678466",
    appId: "1:495391678466:web:094b060632ba99bc27071b" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const donorForm = document.getElementById('donorForm');
const donorList = document.getElementById('donorList');
const filterGroup = document.getElementById('filterGroup');

let allDonors = [];

// ৯০ দিন হিসাব করার লজিক
function getStatus(lastDonationDateStr) {
    if (!lastDonationDateStr) {
        return { status: "রক্ত দিতে প্রস্তুত (Available)", isAvailable: true };
    }

    const today = new Date();
    const lastDate = new Date(lastDonationDateStr);
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 90) {
        return { status: "রক্ত দিতে প্রস্তুত (Available)", isAvailable: true };
    } else {
        const remaining = 90 - diffDays;
        return { status: `সাময়িক বিরতি (${remaining} দিন পর দিতে পারবেন)`, isAvailable: false };
    }
}

// ডোনারদের তালিকা প্রদর্শন
function renderDonors(donors) {
    if (!donorList) return;
    donorList.innerHTML = '';
    
    if (donors.length === 0) {
        donorList.innerHTML = '<p style="padding: 15px; text-align: center; color: #666;">কোনো রক্তদাতার তথ্য পাওয়া যায়নি।</p>';
        return;
    }

    donors.forEach(donor => {
        const lastDonationDate = donor.lastDonation ? donor.lastDonation.toDate() : null;
        const { status, isAvailable } = getStatus(lastDonationDate);
        
        const lastDonationFormatted = lastDonationDate 
            ? lastDonationDate.toLocaleDateString('bn-BD') 
            : 'তথ্য নেই';

        const card = document.createElement('div');
        card.className = `donor-card ${isAvailable ? '' : 'unavailable'}`;
        card.innerHTML = `
            <h3>${donor.name}</h3>
            <p><strong>রক্তের গ্রুপ:</strong> <span class="badge">${donor.bloodGroup}</span></p>
            <p>📍 <strong>ঠিকানা:</strong> ${donor.address ? donor.address : 'তথ্য নেই'}</p>
            <p>📞 <a href="tel:${donor.phone}">${donor.phone}</a></p>
            <p>• ${status}</p>
            <p><small>সর্বশেষ রক্তদান: ${lastDonationFormatted}</small></p>
            ${isAvailable ? `<button onclick="markDonated('${donor.id}')" class="btn-donate">আজ ডোনেট করেছি</button>` : ''}
        `;
        donorList.appendChild(card);
    });
}

// ডাটাবেজ থেকে ডোনার লোড করা
async function loadDonors() {
    try {
        const querySnapshot = await getDocs(collection(db, "donors"));
        allDonors = [];
        querySnapshot.forEach((docSnap) => {
            allDonors.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderDonors(allDonors);
    } catch (error) {
        console.error("Error loading donors: ", error);
        if (donorList) {
            donorList.innerHTML = `<p style="color: red; padding: 15px; text-align: center;">ডাটা লোড করতে সমস্যা হয়েছে: ${error.message}</p>`;
        }
    }
}

// নতুন ডোনার যুক্ত করা
if (donorForm) {
    donorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value.trim();
        const addressInput = document.getElementById('address');
        const address = addressInput ? addressInput.value : '';
        const bloodGroup = document.getElementById('bloodGroup').value;
        const lastDonation = document.getElementById('lastDonation').value;

        try {
            const donorsRef = collection(db, "donors");
            const q = query(donorsRef, where("phone", "==", phone));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert("এই মোবাইল নম্বরটি দিয়ে ইতোমধ্যে নিবন্ধন করা হয়েছে!");
                return;
            }

            await addDoc(donorsRef, {
                name: name,
                phone: phone,
                address: address,
                bloodGroup: bloodGroup,
                lastDonation: lastDonation ? new Date(lastDonation) : null,
                createdAt: new Date()
            });

            alert("সফলভাবে নিবন্ধন সম্পন্ন হয়েছে!");
            donorForm.reset();
            loadDonors();

        } catch (error) {
            console.error("Error adding donor: ", error);
            alert("তথ্য সেভ করতে সমস্যা হয়েছে: " + error.message);
        }
    });
}

// ফিল্টারিং
if (filterGroup) {
    filterGroup.addEventListener('change', (e) => {
        const selectedGroup = e.target.value;
        if (selectedGroup === 'ALL') {
            renderDonors(allDonors);
        } else {
            const filtered = allDonors.filter(donor => donor.bloodGroup === selectedGroup);
            renderDonors(filtered);
        }
    });
}

// আজ ডোনেট করেছি বাটন হ্যান্ডলার
window.markDonated = async function(id) {
    if (confirm("আপনি কি নিশ্চিত যে আজ রক্ত দিয়েছেন?")) {
        try {
            const donorRef = doc(db, "donors", id);
            await updateDoc(donorRef, {
                lastDonation: new Date()
            });
            alert("আপনার রক্তদানের তথ্য আপডেট করা হয়েছে। ধন্যবাদ!");
            loadDonors();
        } catch (error) {
            console.error("Error updating status: ", error);
            alert("আপডেট করতে সমস্যা হয়েছে।");
        }
    }
};

// পেজ লোড হলে ডাটা আনা
loadDonors();
        
