    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
    import { getFirestore, collection, addDoc, getDocs, deleteDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
      authDomain: "daisy-s-website.firebaseapp.com",
      projectId: "daisy-s-website",
      storageBucket: "daisy-s-website.appspot.com",
      messagingSenderId: "595443495060",
      appId: "1:595443495060:web:7bbdd1108ad336d55c8481",
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const form = document.getElementById('productForm');
    const productList = document.getElementById('productList');

    async function loadProducts() {
      productList.innerHTML = '';
      const snapshot = await getDocs(collection(db, "Products"));
      snapshot.forEach((product) => {
        const data = product.data();
        const li = document.createElement('li');
        li.innerHTML = `
          <span><strong>${data.name}</strong> - £${parseFloat(data.price).toFixed(2)}</span>
          <div>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </div>`;

        // Handle delete
        li.querySelector('.delete-btn').onclick = async () => {
          await deleteDoc(doc(db, "Products", product.id));
          loadProducts();
        };

        // Handle edit
        li.querySelector('.edit-btn').onclick = () => {
          document.getElementById('title').value = data.name;
          document.getElementById('image').value = data.image;
          document.getElementById('price').value = data.price;
          document.getElementById('description').value = data.description;
          form.setAttribute('data-edit-id', product.id);
        };

        productList.appendChild(li);
      });
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('title').value;
      const image = document.getElementById('image').value;
      const price = parseFloat(document.getElementById('price').value);
      const description = document.getElementById('description').value;
      const editId = form.getAttribute('data-edit-id');

      const productData = { name, image, price, description };

      if (editId) {
        await setDoc(doc(db, "Products", editId), productData);
        form.removeAttribute('data-edit-id');
      } else {
        await addDoc(collection(db, "Products"), productData);
      }

      form.reset();
      loadProducts();
    };

    loadProducts();
