import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDseKsHoRE-1iwU8gQCraAkJkYdRNyvqUc",
  authDomain: "zoology-blood-bank.firebaseapp.com",
  projectId: "zoology-blood-bank",
  storageBucket: "zoology-blood-bank.firebaseapp.com",
  messagingSenderId: "495391678466",
  appId: "1:495391678466:web:094b060632ba99bc27071b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const donorForm = document.getElementById('donorForm');
const donorList = document.getElementById('donorList');
const filterGroup = document.getElementById('filterGroup');

let allDonors = [];

// ৯০ দিন (৩ মাস) এর হিসাব বের করার লজিক
function getStatus(lastDonationDateStr = "") {
    if (!lastDonationDateStr) {
        return { status: "রক্ত দিতে প্রস্তুত (Available)", isAvailable: true };
    }

    const today = new Date();
    const lastDate = new Date(lastDonationDateStr);
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 90) {
        return { status: "রক্ত দিতে প্রস্তুত (Available)", isAvailable: true };
    } else {
        const remaining = 90 - diffDays;
        return { status: `ইতোমধ্যে ডোনেট করেছেন (${remaining} দিন পর আবার দিতে পারবেন)`, isAvailable: false };
    }
}

// নতুন রক্তদাতার তথ্য জমা নেওয়া
if (donorForm) {
    donorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        const bloodGroupInput = document.getElementById('bloodGroup');
        const lastDonationInput = document.getElementById('lastDonation');

        try {
            await addDoc(collection(db, "donors"), {
                name: nameInput.value,
                phone: phoneInput.value,
                bloodGroup: bloodGroupInput.value,
                lastDonation: lastDonationInput.value || null,
                createdAt: new Date()
            });
            alert("সফলভাবে নিবন্ধন সম্পন্ন হয়েছে!");
            donorForm.reset();
            loadDonors();
        } catch (error) {
            console.error("Error: ", error);
            alert("ডাটা সেভ করতে সমস্যা হয়েছে!");
        }
    });
}

// ডাটাবেজ থেকে সকল রক্তদাতার তালিকা নিয়ে আসা
async function loadDonors() {
    if (!donorList) return;
    donorList.innerHTML = "<p class='text-gray-500'>ডাটা লোড হচ্ছে...</p>";
    try {
        const querySnapshot = await getDocs(collection(db, "donors"));
        allDonors = [];
        querySnapshot.forEach((docSnap) => {
            allDonors.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderDonors(allDonors);
    } catch (error) {
        console.error("Error: ", error);
        donorList.innerHTML = "<p class='text-red-500'>ডাটা লোড করতে ব্যর্থ হয়েছে!</p>";
    }
}

// স্ক্রিনে রক্তদাতাদের কার্ড আকারে দেখানো
function renderDonors(donors = []) {
    if (!donorList || !filterGroup) return;
    const selectedGroup = filterGroup.value;
    donorList.innerHTML = "";

    const filtered = donors.filter((d) => selectedGroup === "ALL" || d.bloodGroup === selectedGroup);

    if (filtered.length === 0) {
        donorList.innerHTML = "<p class='text-gray-500'>কোনো তথ্য পাওয়া যায়নি।</p>";
        return;
    }

    filtered.forEach((donor) => {
        const info = getStatus(donor.lastDonation);
        const card = document.createElement('div');
        
        card.className = `p-4 rounded-lg border-2 ${info.isAvailable ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`;
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg text-gray-800">${donor.name}</h3>
                    <p class="text-sm text-gray-600">📞 <a href="tel:${donor.phone}" class="underline font-semibold text-blue-600">${donor.phone}</a></p>
                    <p class="text-sm font-semibold mt-1 ${info.isAvailable ? 'text-green-700' : 'text-red-600'}">
                        ● ${info.status}
                    </p>
                </div>
                <span class="bg-red-600 text-white font-bold px-3 py-1 rounded-full text-sm">
                    ${donor.bloodGroup}
                </span>
            </div>
            <div class="mt-3 pt-2 border-t flex justify-between items-center text-xs text-gray-500">
                <span>সর্বশেষ রক্তদান: ${donor.lastDonation || 'তথ্য নেই'}</span>
                <button onclick="markAsDonated('${donor.id}')" class="bg-gray-800 hover:bg-black text-white px-2 py-1 rounded">
                    আজ ডোনেট করেছি
                </button>
            </div>
        `;
        donorList.appendChild(card);
    });
}

// "আজ ডোনেট করেছি" বাটন ফাংশন
window.markAsDonated = async (donorId = "") => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (confirm("আপনি কি নিশ্চিত যে আজ রক্ত দিয়েছেন?")) {
        try {
            const donorRef = doc(db, "donors", donorId);
            await updateDoc(donorRef, {
                lastDonation: todayStr
            });
            alert("আপনার রক্তদানের তারিখ সফলভাবে আপডেট করা হয়েছে!");
            loadDonors();
        } catch (error) {
            alert("আপডেট করা সম্ভব হয়নি!");
        }
    }
};

if (filterGroup) {
    filterGroup.addEventListener('change', () => renderDonors(allDonors));
}

// প্রারম্ভিক লোড
loadDonors();
