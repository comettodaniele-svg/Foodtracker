// React Native (Expo) – Food Tracker Android Versione A
// Funziona: Foto del piatto → riconoscimento cibi → domande quantità → calcolo macro

import { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const PORTIONS = {
  kiwi: { pezzo: 75 },
  noci: { pezzo: 5 },
  latte: { bicchiere: 200, ml: 1 },
  pasta: { g: 100 },
  pomodori: { g: 50 },
  olio: { cucchiaio: 10 },
  parmigiano: { g: 5 }
};

export default function App() {
  const [image, setImage] = useState(null);
  const [items, setItems] = useState([]);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!result.canceled) {
      setImage(result.assets[0]);
      recognizeFood(result.assets[0].base64);
    }
  }

  async function recognizeFood(base64Image) {
    // MOCK: in produzione usare AI/vision API
    const aiResult = [
      { food: 'pasta', unit: 'g' },
      { food: 'pomodori', unit: 'g' },
      { food: 'olio', unit: 'cucchiaio' }
    ];

    for (const f of aiResult) {
      const quantity = await askQuantity(f.food, f.unit);
      addItem(f.food, f.unit, quantity);
    }
  }

  function askQuantity(food, unit) {
    return new Promise(resolve => {
      Alert.prompt(
        `Quantità di ${food}?`,
        `Inserisci quanta ${food} c'è (${unit})`,
        [{ text: 'OK', onPress: val => resolve(parseFloat(val) || 1) }],
        'plain-text',
        '100'
      );
    });
  }

  async function addItem(food, unit, quantity) {
    const grams = (PORTIONS[food]?.[unit] || 100) * quantity;
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${food}&search_simple=1&action=process&json=1&page_size=1`);
    const data = await res.json();
    if (!data.products?.length) return;

    const n = data.products[0].nutriments;
    const factor = grams / 100;

    setItems(prev => [...prev, {
      name: `${quantity} ${unit} ${food}`,
      calories: (n['energy-kcal_100g'] || 0) * factor,
      protein: (n.proteins_100g || 0) * factor,
      carbs: (n.carbohydrates_100g || 0) * factor,
      fat: (n.fat_100g || 0) * factor,
      fiber: (n.fiber_100g || 0) * factor
    }]);
  }

  const totals = items.reduce((a, i) => {
    a.calories += i.calories;
    a.protein += i.protein;
    a.carbs += i.carbs;
    a.fat += i.fat;
    a.fiber += i.fiber;
    return a;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold' }}>🍽️ Food Tracker – Versione A</Text>

      <Button title="Scatta foto piatto" onPress={takePhoto} />

      {image && <Text>Foto caricata!</Text>}

      <FlatList
        data={items}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <Text>{item.name} – {item.calories.toFixed(0)} kcal</Text>
        )}
      />

      <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Totali giornata</Text>
      <Text>🔥 {totals.calories.toFixed(0)} kcal</Text>
      <Text>🥩 {totals.protein.toFixed(1)} g</Text>
      <Text>🍞 {totals.carbs.toFixed(1)} g</Text>
      <Text>🥑 {totals.fat.toFixed(1)} g</Text>
      <Text>🌾 {totals.fiber.toFixed(1)} g</Text>
    </View>
  );
}
