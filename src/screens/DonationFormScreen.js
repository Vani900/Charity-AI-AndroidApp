/**
 * Donation Form Screen – select type, AI match NGO, schedule pickup.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { createDonation, fetchMatches, clearCreateSuccess, clearDonationError } from '../redux/slices/donationSlice';
import { ngosAPI, matchingAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DonationTypeIcons } from '../utils/theme';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const RESOURCE_TYPES = [
  { type: 'money', label: 'Money', color: Colors.money },
  { type: 'food', label: 'Food', color: Colors.food },
  { type: 'clothes', label: 'Clothes', color: Colors.clothes },
  { type: 'books', label: 'Books', color: Colors.books },
];

export default function DonationFormScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { isLoading, matches, createSuccess, error } = useSelector((s) => s.donations);
  const preselect = route?.params?.preselect;

  const [step, setStep] = useState(1); // 1=type, 2=details, 3=match, 4=confirm
  const [selectedType, setSelectedType] = useState(preselect || null);
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [location, setLocation] = useState(null);
  const [selectedNGO, setSelectedNGO] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [images, setImages] = useState([]);
  const [expandedNgoId, setExpandedNgoId] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState('UPI');
  const [explicitlyConfirmed, setExplicitlyConfirmed] = useState(false);
  const [foodType, setFoodType] = useState('veg');

  const [matchingNgos, setMatchingNgos] = useState([]);
  const [categories, setCategories] = useState({ bestMatches: [], nearbyNgos: [], otherNgos: [] });
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchingError, setMatchingError] = useState(null);

  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const runLocalMatching = async () => {
    setLoadingMatches(true);
    setMatchingError(null);
    try {
      const lat = location?.latitude || 13.0827;
      const lng = location?.longitude || 80.2707;
      
      const [reqsRes, nearbyRes] = await Promise.all([
        ngosAPI.getRequirements(),
        matchingAPI.getNearby({
          longitude: lng,
          latitude: lat,
          maxDistance: 200000 // 200km radius
        }).catch(() => ({ data: { success: true, data: [] } }))
      ]);

      const allRequirements = reqsRes.data?.data || reqsRes.data || [];
      const ngosList = nearbyRes.data?.data || [];

      if (ngosList.length === 0) {
        setMatchingNgos([]);
        setCategories({ bestMatches: [], nearbyNgos: [], otherNgos: [] });
        return;
      }

      const scoredNgos = ngosList.map((ngo) => {
        const ngoId = ngo._id || ngo.id;
        
        const matchingReq = allRequirements.find(
          (r) => (r.ngoId?._id?.toString() === ngoId.toString() || r.ngoId?.toString() === ngoId.toString()) &&
                 r.category?.toLowerCase() === selectedType?.toLowerCase() &&
                 r.status !== 'closed'
        );

        let distance = 1.5;
        if (location && ngo.location?.coordinates) {
          const [ngoLng, ngoLat] = ngo.location.coordinates;
          distance = calculateHaversineDistance(
            location.latitude,
            location.longitude,
            ngoLat,
            ngoLng
          );
        } else if (ngo.location?.coordinates) {
          const [ngoLng, ngoLat] = ngo.location.coordinates;
          distance = calculateHaversineDistance(
            13.0827,
            80.2707,
            ngoLat,
            ngoLng
          );
        }

        let score = 30; // base score
        let reason = `Verified Match: Accepts ${selectedType?.toUpperCase()} and is registered near Chennai.`;
        let priority = 4;

        if (matchingReq) {
          score += 40;
          priority = 1;
          const urgency = matchingReq.urgency?.toLowerCase() || 'medium';
          if (urgency === 'critical') score += 20;
          else if (urgency === 'high') score += 15;
          else if (urgency === 'medium') score += 10;
          else score += 5;

          reason = `Perfect Match: NGO has an active ${urgency.toUpperCase()} requirement for ${selectedType?.toUpperCase()} and is nearby.`;
        } else {
          if (distance <= 15) {
            score += 20;
            priority = 2;
            reason = `Nearby Match: Located ${distance.toFixed(1)} km away, accepting ${selectedType?.toUpperCase()} donations.`;
          } else {
            score += 5;
            priority = 3;
            reason = `Extended Match: Accepts ${selectedType?.toUpperCase()} but is located further (${distance.toFixed(1)} km).`;
          }
        }

        if (ngo.approvalStatus === 'approved') {
          score += 10;
        }

        score = Math.min(score, 100);

        return {
          ...ngo,
          ngo_id: ngoId,
          ngo_name: ngo.name,
          ngo_address: ngo.address || 'Chennai Partner Area',
          distance_km: distance,
          urgency: matchingReq ? matchingReq.urgency : 'medium',
          score: score / 100,
          reason,
          priority,
          matchingReq,
        };
      });

      scoredNgos.sort((a, b) => b.score - a.score);

      const bestMatches = scoredNgos.filter((ngo) => ngo.priority === 1);
      const nearbyNgos = scoredNgos.filter((ngo) => ngo.priority === 2);
      const otherNgos = scoredNgos.filter((ngo) => ngo.priority === 3 || ngo.priority === 4);

      setCategories({
        bestMatches,
        nearbyNgos,
        otherNgos,
      });
      setMatchingNgos(scoredNgos);
    } catch (err) {
      console.warn('Failed to calculate local matching:', err.message);
      setMatchingError('Failed to retrieve matched NGOs. Please retry.');
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (step === 3) {
      runLocalMatching();
    }
  }, [step, selectedType]);

  useEffect(() => {
    if (preselect) { setSelectedType(preselect); setStep(2); }
  }, [preselect]);

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (createSuccess) {
      dispatch(clearCreateSuccess());
      Alert.alert('Donation Created! 🎉', 'Your donation has been submitted. AI is matching you with the best NGO!', [
        { text: 'Track Donation', onPress: () => navigation.goBack() },
      ]);
    }
  }, [createSuccess]);

  useEffect(() => {
    if (error) {
      Alert.alert('Submission Failed ❌', error);
      dispatch(clearDonationError());
    }
  }, [error]);

  const getLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to select images.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...newImages].slice(0, 3));
    }
  };

  const findMatches = async () => {
    const lat = location?.latitude || 13.0827;
    const lng = location?.longitude || 80.2707;
    setStep(3);
    const finalDescription = selectedType === 'food'
      ? `[Food Type: ${foodType.toUpperCase()}] Donation of ${quantity} food resource.`
      : `Donation of ${quantity} ${selectedType} resource.`;
    dispatch(fetchMatches({
      resource_type: selectedType,
      latitude: lat,
      longitude: lng,
      description: finalDescription,
      quantity,
    }));
  };

  const submitDonation = () => {
    if (!quantity) { Alert.alert('Error', 'Please enter quantity'); return; }

    const finalDescription = selectedType === 'food'
      ? `[Food Type: ${foodType.toUpperCase()}] Donation of ${quantity} food resource.`
      : `Donation of ${quantity} ${selectedType} resource.`;

    const formData = new FormData();
    formData.append('category', selectedType);
    formData.append('quantity', quantity);
    formData.append('description', finalDescription);
    if (selectedNGO?.ngo_id || selectedNGO?._id || selectedNGO?.id) {
      formData.append('assignedNgoId', selectedNGO?.ngo_id || selectedNGO?._id || selectedNGO?.id);
    }

    images.forEach((uri, index) => {
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append('images', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename || `image_${index}.jpg`,
        type,
      });
    });

    dispatch(createDonation(formData));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Donation</Text>
          <Text style={styles.headerSub}>Step {step} of 4</Text>
          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Step 1: Select Type */}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>What are you donating? 🎁</Text>
              <View style={styles.typeGrid}>
                {RESOURCE_TYPES.map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[styles.typeCard, selectedType === item.type && styles.typeCardActive]}
                    onPress={() => setSelectedType(item.type)}
                  >
                    <Text style={styles.typeEmoji}>{DonationTypeIcons[item.type]}</Text>
                    <Text style={[styles.typeLabel, selectedType === item.type && { color: item.color }]}>
                      {item.label}
                    </Text>
                    {selectedType === item.type && (
                      <View style={[styles.typeCheck, { backgroundColor: item.color }]}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Emergency Toggle */}
              <TouchableOpacity
                style={[styles.emergencyToggle, isEmergency && styles.emergencyToggleActive]}
                onPress={() => setIsEmergency(!isEmergency)}
              >
                <Text style={styles.emergencyToggleIcon}>🚨</Text>
                <View style={styles.emergencyToggleText}>
                  <Text style={[styles.emergencyToggleTitle, isEmergency && { color: Colors.emergency }]}>
                    Mark as Emergency
                  </Text>
                  <Text style={styles.emergencyToggleSub}>Highest priority matching</Text>
                </View>
                <View style={[styles.toggle, isEmergency && styles.toggleActive]}>
                  <View style={[styles.toggleDot, isEmergency && styles.toggleDotActive]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextBtn, !selectedType && styles.nextBtnDisabled]}
                onPress={() => selectedType && setStep(2)}
                disabled={!selectedType}
              >
                <Text style={styles.nextBtnText}>Continue →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>Donation Details 📋</Text>
              <View style={styles.selectedType}>
                <Text style={styles.selectedTypeEmoji}>{DonationTypeIcons[selectedType]}</Text>
                <Text style={styles.selectedTypeLabel}>{selectedType?.toUpperCase()}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity / Amount *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={selectedType === 'money' ? '₹500' : selectedType === 'blood' ? '450 ml' : '5 kg / 10 units'}
                  placeholderTextColor={Colors.textLight}
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              {selectedType === 'food' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Food Type *</Text>
                  <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                    {['veg', 'non-veg'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.foodTypeBtn,
                          foodType === type && styles.foodTypeBtnActive
                        ]}
                        onPress={() => setFoodType(type)}
                      >
                        <Ionicons
                          name={foodType === type ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={foodType === type ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={[styles.foodTypeLabel, foodType === type && { color: Colors.primary }]}>
                          {type === 'veg' ? 'Veg 🟢' : 'Non-Veg 🔴'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Photos / Proof of Donation (optional, max 3)</Text>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={24} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.imagePickerBtnText}>Select or Capture Photo</Text>
                </TouchableOpacity>
                {images.length > 0 && (
                  <View style={styles.imagesGrid}>
                    {images.map((uri, idx) => (
                      <View key={idx} style={styles.imageContainer}>
                        <Image source={{ uri }} style={styles.imagePreview} />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImages(images.filter((_, i) => i !== idx))}>
                          <Ionicons name="close-circle" size={22} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.stepButtons}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={findMatches}>
                  <Text style={styles.nextBtnText}>Find NGOs →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 3: AI Match */}
          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Recommended NGOs for Your Donation 🤖</Text>
              <Text style={styles.stepSub}>Based on your donation type, location, urgency, and NGO requirements</Text>

              {loadingMatches ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Finding best matches...</Text>
                </View>
              ) : matchingError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{matchingError}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={runLocalMatching}>
                    <Text style={styles.retryBtnText}>Retry Match</Text>
                  </TouchableOpacity>
                </View>
              ) : matchingNgos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>No NGOs Found</Text>
                  <Text style={styles.emptySubtitle}>No verified NGOs currently accept this donation type.</Text>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                    <Text style={styles.backBtnText}>Choose Another Category</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 400, marginBottom: Spacing.md }}>
                  {/* 1. Best Matches */}
                  {categories.bestMatches.length > 0 && (
                    <View style={styles.categoryContainer}>
                      <Text style={styles.categoryTitle}>🌟 BEST MATCHES</Text>
                      {categories.bestMatches.map((m) => {
                        const isExpanded = expandedNgoId === m.ngo_id;
                        const isSelected = selectedNGO?.ngo_id === m.ngo_id;
                        return (
                          <View key={m.ngo_id} style={[styles.ngoCard, isSelected && styles.ngoCardSelected]}>
                            <TouchableOpacity style={styles.ngoCardHeaderTouchable} onPress={() => setExpandedNgoId(isExpanded ? null : m.ngo_id)}>
                              <View style={styles.ngoCardHeader}>
                                <Text style={styles.ngoName}>{m.ngo_name}</Text>
                                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.textSecondary} />
                              </View>
                              <View style={styles.ngoMeta}>
                                <View style={styles.metaItem}>
                                  <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                                  <Text style={styles.metaText}>{m.distance_km.toFixed(1)} km away</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                                  <Text style={[styles.metaText, { color: Colors.success, fontWeight: '700' }]}>Verified</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="analytics-outline" size={14} color={Colors.primary} />
                                  <Text style={[styles.metaText, { color: Colors.primary, fontWeight: '700' }]}>{Math.round(m.score * 100)}% Match</Text>
                                </View>
                              </View>
                              {m.reason && <Text style={styles.recommendationReason}>🤖 {m.reason}</Text>}
                            </TouchableOpacity>
                            {isExpanded && (
                              <View style={styles.ngoDetailsExpand}>
                                <Text style={styles.ngoDetailsLabel}>Verification Status:</Text>
                                <Text style={[styles.ngoDetailsVal, { color: Colors.success, fontWeight: '700' }]}>✓ Approved & Verified Partner</Text>
                                <Text style={styles.ngoDetailsLabel}>Location Address:</Text>
                                <Text style={styles.ngoDetailsVal}>{m.ngo_address}</Text>
                                <Text style={styles.ngoDetailsLabel}>Accepted donation types:</Text>
                                <Text style={styles.ngoDetailsVal}>Food, Clothes, Books, Money</Text>
                                {m.matchingReq && (
                                  <>
                                    <Text style={styles.ngoDetailsLabel}>Active Requirement description:</Text>
                                    <Text style={styles.ngoDetailsVal}>{m.matchingReq.description}</Text>
                                    <Text style={styles.ngoDetailsLabel}>Urgency:</Text>
                                    <Text style={[styles.ngoDetailsVal, { color: URGENCY_COLORS[m.urgency] || Colors.primary, fontWeight: '700' }]}>{m.urgency?.toUpperCase()}</Text>
                                  </>
                                )}
                                <TouchableOpacity style={[styles.selectNgoBtn, isSelected && styles.selectNgoBtnActive]} onPress={() => setSelectedNGO(m)}>
                                  <Text style={styles.selectNgoBtnText}>{isSelected ? '✓ NGO Selected' : 'Select This NGO'}</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* 2. Nearby Verified NGOs */}
                  {categories.nearbyNgos.length > 0 && (
                    <View style={styles.categoryContainer}>
                      <Text style={styles.categoryTitle}>📍 NEARBY VERIFIED NGOs</Text>
                      {categories.nearbyNgos.map((m) => {
                        const isExpanded = expandedNgoId === m.ngo_id;
                        const isSelected = selectedNGO?.ngo_id === m.ngo_id;
                        return (
                          <View key={m.ngo_id} style={[styles.ngoCard, isSelected && styles.ngoCardSelected]}>
                            <TouchableOpacity style={styles.ngoCardHeaderTouchable} onPress={() => setExpandedNgoId(isExpanded ? null : m.ngo_id)}>
                              <View style={styles.ngoCardHeader}>
                                <Text style={styles.ngoName}>{m.ngo_name}</Text>
                                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.textSecondary} />
                              </View>
                              <View style={styles.ngoMeta}>
                                <View style={styles.metaItem}>
                                  <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                                  <Text style={styles.metaText}>{m.distance_km.toFixed(1)} km away</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                                  <Text style={[styles.metaText, { color: Colors.success, fontWeight: '700' }]}>Verified</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="analytics-outline" size={14} color={Colors.primary} />
                                  <Text style={[styles.metaText, { color: Colors.primary, fontWeight: '700' }]}>{Math.round(m.score * 100)}% Match</Text>
                                </View>
                              </View>
                              {m.reason && <Text style={styles.recommendationReason}>🤖 {m.reason}</Text>}
                            </TouchableOpacity>
                            {isExpanded && (
                              <View style={styles.ngoDetailsExpand}>
                                <Text style={styles.ngoDetailsLabel}>Verification Status:</Text>
                                <Text style={[styles.ngoDetailsVal, { color: Colors.success, fontWeight: '700' }]}>✓ Approved & Verified Partner</Text>
                                <Text style={styles.ngoDetailsLabel}>Location Address:</Text>
                                <Text style={styles.ngoDetailsVal}>{m.ngo_address}</Text>
                                <Text style={styles.ngoDetailsLabel}>Accepted donation types:</Text>
                                <Text style={styles.ngoDetailsVal}>Food, Clothes, Books, Money</Text>
                                <TouchableOpacity style={[styles.selectNgoBtn, isSelected && styles.selectNgoBtnActive]} onPress={() => setSelectedNGO(m)}>
                                  <Text style={styles.selectNgoBtnText}>{isSelected ? '✓ NGO Selected' : 'Select This NGO'}</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* 3. Other Verified NGOs */}
                  {categories.otherNgos.length > 0 && (
                    <View style={styles.categoryContainer}>
                      <Text style={styles.categoryTitle}>🏢 OTHER VERIFIED NGOs</Text>
                      {categories.otherNgos.map((m) => {
                        const isExpanded = expandedNgoId === m.ngo_id;
                        const isSelected = selectedNGO?.ngo_id === m.ngo_id;
                        return (
                          <View key={m.ngo_id} style={[styles.ngoCard, isSelected && styles.ngoCardSelected]}>
                            <TouchableOpacity style={styles.ngoCardHeaderTouchable} onPress={() => setExpandedNgoId(isExpanded ? null : m.ngo_id)}>
                              <View style={styles.ngoCardHeader}>
                                <Text style={styles.ngoName}>{m.ngo_name}</Text>
                                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.textSecondary} />
                              </View>
                              <View style={styles.ngoMeta}>
                                <View style={styles.metaItem}>
                                  <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                                  <Text style={styles.metaText}>{m.distance_km.toFixed(1)} km away</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                                  <Text style={[styles.metaText, { color: Colors.success, fontWeight: '700' }]}>Verified</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="analytics-outline" size={14} color={Colors.primary} />
                                  <Text style={[styles.metaText, { color: Colors.primary, fontWeight: '700' }]}>{Math.round(m.score * 100)}% Match</Text>
                                </View>
                              </View>
                              {m.reason && <Text style={styles.recommendationReason}>🤖 {m.reason}</Text>}
                            </TouchableOpacity>
                            {isExpanded && (
                              <View style={styles.ngoDetailsExpand}>
                                <Text style={styles.ngoDetailsLabel}>Verification Status:</Text>
                                <Text style={[styles.ngoDetailsVal, { color: Colors.success, fontWeight: '700' }]}>✓ Approved & Verified Partner</Text>
                                <Text style={styles.ngoDetailsLabel}>Location Address:</Text>
                                <Text style={styles.ngoDetailsVal}>{m.ngo_address}</Text>
                                <Text style={styles.ngoDetailsLabel}>Accepted donation types:</Text>
                                <Text style={styles.ngoDetailsVal}>Food, Clothes, Books, Money</Text>
                                <TouchableOpacity style={[styles.selectNgoBtn, isSelected && styles.selectNgoBtnActive]} onPress={() => setSelectedNGO(m)}>
                                  <Text style={styles.selectNgoBtnText}>{isSelected ? '✓ NGO Selected' : 'Select This NGO'}</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              )}

              <View style={styles.stepButtons}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextBtn, !selectedNGO && styles.nextBtnDisabled]}
                  onPress={() => selectedNGO && setStep(4)}
                  disabled={!selectedNGO}
                >
                  <Text style={styles.nextBtnText}>Confirm NGO →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <>
              <Text style={styles.stepTitle}>Confirm Donation Summary ✅</Text>
              
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Donation Category</Text>
                  <Text style={styles.summaryVal}>{DonationTypeIcons[selectedType]} {selectedType?.toUpperCase()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Donation Details</Text>
                  <Text style={styles.summaryVal} numberOfLines={1}>{description}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Quantity/Amount</Text>
                  <Text style={styles.summaryVal}>{quantity}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Donor Location</Text>
                  <Text style={styles.summaryVal}>
                    {location ? `Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}` : 'Not set'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Selected NGO</Text>
                  <Text style={[styles.summaryVal, { color: Colors.primary }]}>{selectedNGO?.ngo_name || 'Auto-matched'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>NGO Verification</Text>
                  <Text style={[styles.summaryVal, { color: Colors.success }]}>✓ Verified Partner</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>NGO Location</Text>
                  <Text style={styles.summaryVal}>{selectedNGO?.ngo_address || 'Chennai Partner Office'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Urgency Status</Text>
                  <Text style={[styles.summaryVal, isEmergency && { color: Colors.emergency }]}>
                    {isEmergency ? '🚨 Emergency' : '📦 Standard'}
                  </Text>
                </View>

                {selectedType === 'money' && (
                  <>
                    <View style={styles.paymentSectionHeader}>
                      <Text style={styles.paymentTitle}>Select Payment Method</Text>
                      <Text style={styles.paymentSecurityNote}>🔒 UPI PIN or passwords will never be collected.</Text>
                    </View>

                    {['UPI', 'Google Pay', 'PhonePe', 'Paytm'].map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[styles.paymentMethodRow, selectedPayment === method && styles.paymentMethodRowActive]}
                        onPress={() => setSelectedPayment(method)}
                      >
                        <Ionicons
                          name={selectedPayment === method ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={selectedPayment === method ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={styles.paymentMethodLabel}>{method}</Text>
                      </TouchableOpacity>
                    ))}

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>Payment Status</Text>
                      <Text style={[styles.summaryVal, { color: Colors.warning }]}>Payment Integration Pending</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>Audit Reference</Text>
                      <Text style={styles.summaryVal}>N/A - Integration Pending</Text>
                    </View>
                  </>
                )}

                <View style={[styles.summaryRow, styles.blockchainRow]}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
                  <Text style={styles.blockchainNote}>
                    Will be logged as a backend-generated transparency audit reference
                  </Text>
                </View>
              </View>

              <Text style={[styles.verificationHeader, { color: Colors.primary, fontWeight: '700' }]}>
                Your donation will go to: {selectedNGO?.ngo_name}
              </Text>

              {/* Explicit Confirmation Checkbox */}
              <TouchableOpacity
                style={[styles.checkboxContainer, explicitlyConfirmed && styles.checkboxContainerActive]}
                onPress={() => setExplicitlyConfirmed(!explicitlyConfirmed)}
              >
                <Ionicons
                  name={explicitlyConfirmed ? "checkbox" : "square-outline"}
                  size={22}
                  color={explicitlyConfirmed ? Colors.primary : Colors.textSecondary}
                />
                <Text style={styles.checkboxText}>
                  I explicitly confirm all donation details before final submission.
                </Text>
              </TouchableOpacity>

              <View style={styles.stepButtons}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 2 }, (!explicitlyConfirmed || isLoading) && styles.nextBtnDisabled]}
                  onPress={submitDonation}
                  disabled={isLoading || !explicitlyConfirmed}
                >
                  <LinearGradient
                    colors={explicitlyConfirmed ? [Colors.primary, Colors.primaryLight] : [Colors.border, Colors.border]}
                    style={styles.submitGradient}
                  >
                    {isLoading
                      ? <ActivityIndicator color="#FFF" />
                      : <Text style={styles.submitText}>Confirm & Submit 🚀</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: Spacing.xl },
  back: { marginBottom: Spacing.md },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: '#FFF' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.sm, marginTop: 4 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginTop: Spacing.md },
  progressFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 2 },
  content: { padding: Spacing.lg },
  stepTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  stepSub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  typeCard: {
    width: '30%', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, ...Shadows.sm, borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  typeEmoji: { fontSize: 36, marginBottom: 4 },
  typeLabel: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text },
  typeCheck: {
    position: 'absolute', top: 6, right: 6, width: 18, height: 18,
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  emergencyToggle: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, ...Shadows.sm,
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  emergencyToggleActive: { borderColor: Colors.emergency, backgroundColor: '#FFF5F5' },
  emergencyToggleIcon: { fontSize: 28, marginRight: Spacing.md },
  emergencyToggleText: { flex: 1 },
  emergencyToggleTitle: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  emergencyToggleSub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: Colors.border, padding: 3,
  },
  toggleActive: { backgroundColor: Colors.emergency },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF' },
  toggleDotActive: { transform: [{ translateX: 20 }] },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md + 2, alignItems: 'center', marginTop: Spacing.md,
  },
  nextBtnDisabled: { backgroundColor: Colors.border },
  nextBtnText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.md },
  stepButtons: { flexDirection: 'row', gap: Spacing.md },
  backBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  backBtnText: { color: Colors.text, fontWeight: '600' },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: Typography.fontSize.base, color: Colors.text,
    backgroundColor: Colors.background,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg, backgroundColor: '#F0FDF4',
  },
  locationBtnText: { color: Colors.primary, fontWeight: '600', fontSize: Typography.fontSize.md },
  selectedType: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  selectedTypeEmoji: { fontSize: 32 },
  selectedTypeLabel: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.primary },
  loadingBox: { alignItems: 'center', padding: Spacing['2xl'] },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: Typography.fontSize.md },
  emptyState: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.text },
  emptySubtitle: { fontSize: Typography.fontSize.base, color: Colors.textSecondary, textAlign: 'center', marginVertical: Spacing.md },
  ngoCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, ...Shadows.sm, borderWidth: 2, borderColor: 'transparent',
  },
  ngoCardSelected: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  ngoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  ngoName: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  scoreBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.sm },
  ngoMeta: { flexDirection: 'row', gap: Spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  selectedBadgeText: { color: Colors.primary, fontWeight: '600', fontSize: Typography.fontSize.sm },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    ...Shadows.sm, marginBottom: Spacing.lg,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  summaryKey: { color: Colors.textSecondary, fontSize: Typography.fontSize.md },
  summaryVal: { fontWeight: '700', color: Colors.text, fontSize: Typography.fontSize.md },
  blockchainRow: { borderBottomWidth: 0, paddingTop: Spacing.md, gap: Spacing.sm, justifyContent: 'flex-start' },
  blockchainNote: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: '600', flex: 1 },
  submitBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  submitGradient: { padding: Spacing.lg, alignItems: 'center' },
  submitText: { color: '#FFF', fontWeight: '800', fontSize: Typography.fontSize.lg },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: '#F0FDF4',
    marginBottom: Spacing.sm,
  },
  imagePickerBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Typography.fontSize.md,
  },
  imagesGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 11,
  },
  ngoCardAi: {
    borderColor: Colors.primary,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: Spacing.sm,
  },
  aiBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  aiReasonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  ngoCardHeaderTouchable: {
    width: '100%',
  },
  ngoDetailsExpand: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ngoDetailsLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  ngoDetailsVal: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    marginTop: 2,
    fontWeight: '500',
  },
  selectNgoBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  selectNgoBtnActive: {
    backgroundColor: Colors.success,
  },
  selectNgoBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: Typography.fontSize.sm,
  },
  paymentSectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  paymentTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  paymentSecurityNote: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  paymentMethodRowActive: {
    backgroundColor: '#F0FDF4',
  },
  paymentMethodLabel: {
    fontSize: Typography.fontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
  verificationHeader: {
    textAlign: 'center',
    marginVertical: Spacing.md,
    fontSize: Typography.fontSize.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  checkboxContainerActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  checkboxText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  foodTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  foodTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  foodTypeLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  categoryContainer: {
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  recommendationReason: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  errorBox: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    color: Colors.emergency,
    fontWeight: '600',
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    marginTop: Spacing.md,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
