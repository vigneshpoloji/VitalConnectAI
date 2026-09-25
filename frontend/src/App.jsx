import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Droplets,
  HeartHandshake,
  Hospital,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  ShieldCheck,
  Siren,
  Sparkles,
  X,
} from 'lucide-react'

import DonorDashboard from './pages/donor/DonorDashboard'
import HospitalDashboard from './pages/hospital/HospitalDashboard'
import BloodBankDashboard from './pages/bloodbank/BloodBankDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import BloodCampsPage from './pages/camps/BloodCampsPage'
import AuthPage from './pages/AuthPage'
import FeedbackPage from './pages/feedback/FeedbackPage'
import InstallAppBanner from './components/InstallAppBanner'
import { apiService } from './services/api'
import { socket } from './services/socket'

function useNotifications(user, pollInterval = 12000) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      const token = localStorage.getItem('vital_token')
      const district = user.district || 'Kamareddy'
      const role = user.role?.toLowerCase() || 'donor'

      const res = await fetch(
        `http://localhost:5000/api/notifications?district=${encodeURIComponent(
          district
        )}&role=${encodeURIComponent(role)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )
      const data = await res.json()
      if (data.success) {
        setNotifications(data.notifications || [])
        const unread = (data.notifications || []).filter((n) => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch (err) {
      // Backend route optional while developing
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, pollInterval)
    return () => clearInterval(interval)
  }, [fetchNotifications, pollInterval])

  const markAllAsRead = async () => {
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return { notifications, unreadCount, markAllAsRead, refresh: fetchNotifications }
}

gsap.registerPlugin(ScrollTrigger)

const roles = [
  {
    icon: HeartHandshake,
    title: 'Donor',
    label: 'Give with confidence',
    copy: 'Discover verified requests nearby and see the tangible impact of every donation.',
    tone: 'donor',
  },
  {
    icon: Hospital,
    title: 'Hospital',
    label: 'Care without delay',
    copy: 'Coordinate urgent needs with intelligence that keeps care teams one step ahead.',
    tone: 'hospital',
  },
  {
    icon: Building2,
    title: 'Blood Bank',
    label: 'Operate in sync',
    copy: 'Bring inventory, demand signals, and partner networks into a single living picture.',
    tone: 'bank',
  },
  {
    icon: ShieldCheck,
    title: 'Administrator',
    label: 'Lead with clarity',
    copy: 'Govern your ecosystem with precise oversight, data integrity, and complete control.',
    tone: 'admin',
  },
]

const navigationItems = [
  {
    label: 'Home',
    href: '#top',
    type: 'scroll',
    target: 'top',
    items: [
      { label: 'Platform overview', target: 'top', type: 'scroll' },
      { label: 'How VitalConnectAI works', target: 'network', type: 'scroll' },
    ],
  },
  {
    label: 'Find blood',
    href: '#network',
    type: 'portal',
    portal: 'Hospital',
    items: [
      { label: 'Search by blood group', target: 'network', type: 'scroll' },
      { label: 'Emergency requests', portal: 'Hospital', type: 'portal' },
      { label: 'Nearby blood banks', portal: 'Blood Bank', type: 'portal' },
    ],
  },
  {
    label: 'Donate blood',
    href: '#donate',
    type: 'portal',
    portal: 'Donor',
    items: [
      { label: 'Donation eligibility', portal: 'Donor', type: 'portal' },
      { label: 'Book a donation', portal: 'Donor', type: 'portal' },
      { label: 'Donor preparation guide', target: 'donate', type: 'scroll' },
    ],
  },
  {
    label: 'Blood camps',
    href: '/camps',
    type: 'page',
    page: '/camps',
    items: [
      { label: 'Upcoming blood camps', page: '/camps', type: 'page' },
      { label: 'Reserve your place', page: '/camps', type: 'page' },
      { label: 'Host a blood camp', page: '/camps', type: 'page' },
    ],
  },
  {
    label: 'FAQs & feedback',
    href: '/feedback',
    type: 'page',
    page: '/feedback',
    items: [
      { label: 'Donation FAQs', target: 'access', type: 'scroll' },
      { label: 'Request blood FAQs', target: 'access', type: 'scroll' },
      { label: 'Share feedback', page: '/feedback', type: 'page' },
    ],
  },
  {
    label: 'Contact us',
    href: '#footer',
    type: 'scroll',
    target: 'footer',
    items: [
      { label: 'Email support', href: 'mailto:vigneshpoloji@gmail.com', type: 'link' },
      { label: 'Call our care team', href: 'tel:+917569876200', type: 'link' },
      { label: 'Partner with us', page: '/feedback', type: 'page' },
    ],
  },
  {
    label: 'Impact',
    href: '#impact',
    type: 'scroll',
    target: 'impact',
    items: [
      { label: 'Lives supported', target: 'impact', type: 'scroll' },
      { label: 'Network impact', portal: 'Administrator', type: 'portal' },
      { label: 'Community stories', target: 'impact', type: 'scroll' },
    ],
  },
]

const getDashboardPath = (role) => {
  const cleanRole = (role || '').toLowerCase().replace(/[^a-z]/g, '')
  if (cleanRole.includes('hospital')) return '/hospital'
  if (cleanRole.includes('bank') || cleanRole.includes('bloodbank')) return '/bloodbank'
  if (cleanRole.includes('admin')) return '/admin'
  return '/donor'
}

export default function App() {
  const mainRef = useRef(null)
  const botBodyRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [botOpen, setBotOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)

  // Load user session
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vital_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Notifications State & Dropdown
  const { notifications = [], unreadCount = 0, markAllAsRead } = useNotifications
    ? useNotifications(currentUser)
    : { notifications: [], unreadCount: 0, markAllAsRead: () => {} }
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)

  // Prevent landing page from loading if user is already logged in
  const [path, setPath] = useState(() => {
    const current = window.location.pathname
    try {
      const saved = localStorage.getItem('vital_user')
      const user = saved ? JSON.parse(saved) : null
      if (user && (current === '/' || current === '/auth')) {
        const dest = getDashboardPath(user.role)
        window.history.replaceState({}, '', dest)
        return dest
      }
    } catch {}
    return current
  })

  const [intendedRole, setIntendedRole] = useState(null)

  // Find Blood state variables
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('O+')
  const [locationText, setLocationText] = useState('Use my location')
  const [userCoords, setUserCoords] = useState(null)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  // Location Autocomplete State
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Public Live Blood Search Modal States
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)

  // Donor Live District Emergency Feed States
  const [selectedDistrict, setSelectedDistrict] = useState(
    currentUser?.district || 'Kamareddy'
  )
  const [donorRequests, setDonorRequests] = useState([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)

  // Hospital Emergency Requirement Form States
  const [hospitalBloodGroup, setHospitalBloodGroup] = useState('O+')
  const [unitsNeeded, setUnitsNeeded] = useState(2)
  const [urgency, setUrgency] = useState('Critical Trauma')
  const [patientNote, setPatientNote] = useState('')
  const [isSubmittingReq, setIsSubmittingReq] = useState(false)
  const [showHospitalQuickReq, setShowHospitalQuickReq] = useState(false)

  // Admin Camp Accreditation Queue States
  const [adminCampQueue, setAdminCampQueue] = useState([])
  const [isQueueLoading, setIsQueueLoading] = useState(false)

  // Landing Page Chatbot State
  const [landingBotInput, setLandingBotInput] = useState('')
  const [isLandingBotThinking, setIsLandingBotThinking] = useState(false)
  const [landingBotMessages, setLandingBotMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hi, I’m VitalAI.\nI can help you find nearby blood, understand donation eligibility, or locate a blood camp."
    }
  ])

  const handlePublicSearch = useCallback(async () => {
    setIsSearching(true)
    setShowSearchModal(true)

    try {
      const rawLocation = locationText === 'Use my location' ? '' : locationText
      const cleanLoc = rawLocation.replace(/\(.*?\)/g, '').trim()

      let url = `http://localhost:5000/api/bloodbanks/public-search?bloodGroup=${encodeURIComponent(
        selectedBloodGroup
      )}&location=${encodeURIComponent(cleanLoc)}`

      if (userCoords?.lat && userCoords?.lng) {
        url += `&lat=${userCoords.lat}&lng=${userCoords.lng}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setSearchResults(data)
      } else {
        setSearchResults({ results: [] })
      }
    } catch (err) {
      console.error('Public blood search failed:', err)
      setSearchResults({ results: [] })
    } finally {
      setIsSearching(false)
    }
  }, [locationText, selectedBloodGroup, userCoords])

  const fetchDonorEmergencyFeed = useCallback(async (district) => {
    setIsLoadingRequests(true)
    try {
      const query = {
        district: district || selectedDistrict,
        donorBloodGroup: currentUser?.bloodGroup || 'O+',
      }
      const data = await apiService.getBloodRequests(query)
      if (data.success) {
        setDonorRequests(data.requests || [])
      }
    } catch (err) {
      console.error('Failed to load donor requirements feed:', err)
    } finally {
      setIsLoadingRequests(false)
    }
  }, [currentUser?.bloodGroup, selectedDistrict])

  // ============================================================================
  // Real-Time Socket.io District Subscription & Event Routing
  // ============================================================================
  useEffect(() => {
    const activeDistrict = (selectedDistrict || currentUser?.district || 'Kamareddy').trim()
    socket.emit('join_district', activeDistrict)

    const handleEmergencyAlert = (payload) => {
      console.log('[Realtime Emergency Alert]:', payload)
      fetchDonorEmergencyFeed(activeDistrict)
    }

    const handleStockSync = (payload) => {
      console.log('[Realtime Stock Sync]:', payload)
      if (showSearchModal) {
        handlePublicSearch()
      }
    }

    socket.on('new_emergency_broadcast', handleEmergencyAlert)
    socket.on('stock_dispatched_sync', handleStockSync)

    return () => {
      socket.off('new_emergency_broadcast', handleEmergencyAlert)
      socket.off('stock_dispatched_sync', handleStockSync)
    }
  }, [selectedDistrict, currentUser, showSearchModal, fetchDonorEmergencyFeed, handlePublicSearch])

  // Synchronize location changes to selectedDistrict
  useEffect(() => {
    if (
      locationText &&
      locationText !== 'Use my location' &&
      locationText !== 'Location permission denied' &&
      locationText !== 'Geolocation not supported' &&
      locationText !== 'Pinpointing exact location...' &&
      locationText !== 'Detecting district...'
    ) {
      const cleanDistrict = locationText.replace(/\(.*?\)/g, '').trim()
      setSelectedDistrict(cleanDistrict)
    }
  }, [locationText])

  // Auto-scroll chat feed to newest message
  useEffect(() => {
    if (botOpen && botBodyRef.current) {
      botBodyRef.current.scrollTo({
        top: botBodyRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [landingBotMessages, isLandingBotThinking, botOpen])

  const handleLandingBotSend = async (e) => {
    if (e) e.preventDefault()
    const userPrompt = landingBotInput.trim()
    if (!userPrompt || isLandingBotThinking) return

    setLandingBotMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, sender: 'user', text: userPrompt },
    ])
    setLandingBotInput('')
    setIsLandingBotThinking(true)

    try {
      const res = await fetch('http://localhost:5000/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          context: 'landing_page',
          district: selectedDistrict || 'Kamareddy',
        }),
      })

      const data = await res.json()

      setLandingBotMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          sender: 'bot',
          text:
            data.response ||
            '* System online.\n* How can I assist you with blood services?\n\n**Suggestions:**\n* Find blood\n* Donate blood',
        },
      ])
    } catch (err) {
      setLandingBotMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          sender: 'bot',
          text:
            '* Unable to connect to the backend server.\n* Please verify that the backend is running on http://localhost:5000.\n\n**Suggestions:**\n* Check your connection\n* Try again in a moment',
        },
      ])
    } finally {
      setIsLandingBotThinking(false)
    }
  }

  const handleLocationInputChange = async (e) => {
    const val = e.target.value
    setLocationText(val)

    if (val.trim().length >= 1 && val !== 'Use my location') {
      try {
        const res = await fetch(
          `http://localhost:5000/api/bloodbanks/locations?q=${encodeURIComponent(val.trim())}`
        )
        const data = await res.json()
        if (data.success && data.suggestions.length > 0) {
          setLocationSuggestions(data.suggestions)
          setShowSuggestions(true)
        } else {
          setLocationSuggestions([])
          setShowSuggestions(false)
        }
      } catch (err) {
        setLocationSuggestions([])
        setShowSuggestions(false)
      }
    } else {
      setLocationSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestedLocation = (suggestedLoc) => {
    setLocationText(suggestedLoc)
    setSelectedDistrict(suggestedLoc)
    setLocationSuggestions([])
    setShowSuggestions(false)
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationText('Geolocation not supported')
      return
    }

    setIsDetectingLocation(true)
    setLocationText('Pinpointing exact location...')

    const fallbackToIPLocation = async () => {
      try {
        const ipRes = await fetch('https://ipapi.co/json/')
        const ipData = await ipRes.json()
        const place = ipData.city || ipData.region || 'Kamareddy'
        setLocationText(place)
        setSelectedDistrict(place)
        if (ipData.latitude && ipData.longitude) {
          setUserCoords({ lat: ipData.latitude, lng: ipData.longitude })
        }
      } catch (e) {
        setLocationText('Kamareddy')
        setSelectedDistrict('Kamareddy')
      } finally {
        setIsDetectingLocation(false)
      }
    }

    const resolveAddressFromCoords = async (latitude, longitude) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        )
        const data = await res.json()
        const address = data?.address || {}

        const resolvedPlace =
          address.suburb ||
          address.neighbourhood ||
          address.residential ||
          address.village ||
          address.town ||
          address.city ||
          address.district ||
          address.county ||
          address.state_district ||
          'Local Area'

        setLocationText(resolvedPlace)
        setSelectedDistrict(resolvedPlace)
      } catch (err) {
        console.warn('Reverse geocoding error:', err)
        await fallbackToIPLocation()
      } finally {
        setIsDetectingLocation(false)
      }
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserCoords({ lat: latitude, lng: longitude })
        resolveAddressFromCoords(latitude, longitude)
      },
      (error) => {
        console.warn('Browser GPS failed, using IP location lookup:', error.message)
        fallbackToIPLocation()
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const fetchAdminCampProposals = useCallback(async () => {
    const token = localStorage.getItem('vital_token')
    if (!token) return

    setIsQueueLoading(true)
    try {
      const res = await fetch('http://localhost:5000/api/admin/camps/pending', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()

      if (data.success) {
        setAdminCampQueue(data.camps || [])
      } else {
        console.warn('Queue fetch warning:', data.message)
      }
    } catch (err) {
      console.error('Failed to retrieve camp queue:', err)
    } finally {
      setIsQueueLoading(false)
    }
  }, [])

  useEffect(() => {
    const cleanRole = (currentUser?.role || '').toLowerCase().replace(/[^a-z]/g, '')
    if (cleanRole === 'donor' || path === '/donor') {
      fetchDonorEmergencyFeed(selectedDistrict)
    }
    if (cleanRole === 'admin' || path === '/admin') {
      fetchAdminCampProposals()
    }
  }, [currentUser, path, selectedDistrict, fetchDonorEmergencyFeed, fetchAdminCampProposals])

  const handleCommitDonation = async (requestId, hospitalName) => {
    try {
      alert(`Thank you! Response initiated for ${hospitalName}. The care coordination team has been alerted.`)
    } catch (err) {
      console.error('Failed to respond to request:', err)
    }
  }

  const handleDecideCamp = async (campId, actionStatus) => {
    const token = localStorage.getItem('vital_token')
    if (!token) {
      alert('Admin token expired. Please re-login.')
      return
    }

    try {
      const res = await fetch(`http://localhost:5000/api/admin/camps/${campId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: actionStatus }),
      })
      const data = await res.json()

      if (data.success) {
        alert(`Camp has been marked as: ${actionStatus}`)
        setAdminCampQueue((prev) => prev.filter((item) => item._id !== campId))
      } else {
        alert(data.message || 'Status update failed.')
      }
    } catch (err) {
      alert('Network error while processing camp status.')
    }
  }

  const handleActivateRequest = async (e) => {
    if (e) e.preventDefault()

    const token = localStorage.getItem('vital_token')
    const user = JSON.parse(localStorage.getItem('vital_user') || '{}')

    if (!token) {
      alert('Session expired or unauthorized. Please log in as a Hospital first.')
      return
    }

    setIsSubmittingReq(true)

    try {
      const payload = {
        hospitalName: user.name || 'Hospital Emergency Wing',
        bloodGroup: hospitalBloodGroup,
        unitsRequired: Number(unitsNeeded),
        urgencyLevel: urgency,
        patientCondition: patientNote || 'Critical Trauma Emergency',
        district: user.district || 'Kamareddy',
      }

      const response = await fetch('http://localhost:5000/api/blood-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        alert('🚨 Emergency request activated and broadcasted live across network!')
        setPatientNote('')
        setShowHospitalQuickReq(false)

        if (typeof fetchDonorEmergencyFeed === 'function') {
          fetchDonorEmergencyFeed(selectedDistrict)
        }
      } else {
        alert(`Failed to activate: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Request broadcast error:', error)
      alert('Server connection error. Check backend terminal.')
    } finally {
      setIsSubmittingReq(false)
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      const current = window.location.pathname
      if (currentUser && (current === '/' || current === '/auth')) {
        const dest = getDashboardPath(currentUser.role)
        window.history.replaceState({}, '', dest)
        setPath(dest)
      } else {
        setPath(current)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser])

  useEffect(() => {
    if (currentUser && (path === '/' || path === '/auth')) {
      const dest = getDashboardPath(currentUser.role)
      window.history.replaceState({}, '', dest)
      setPath(dest)
    }
  }, [currentUser, path])

  useEffect(() => {
    if (path !== '/') return

    const ctx = gsap.context(() => {
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      heroTl
        .from('.nav.shell', {
          y: -25,
          opacity: 0,
          duration: 0.8,
        })
        .from(
          '.hero-copy > *',
          {
            y: 35,
            opacity: 0,
            stagger: 0.14,
            duration: 0.9,
          },
          '-=0.3'
        )
        .from(
          '.hero-visual',
          {
            scale: 0.92,
            opacity: 0,
            duration: 1.1,
            ease: 'power2.out',
          },
          '-=0.7'
        )

      gsap.from('.role-grid .role-card', {
        scrollTrigger: {
          trigger: '.role-grid',
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 45,
        opacity: 0,
        stagger: 0.15,
        duration: 0.85,
        ease: 'power2.out',
      })

      gsap.from('.finder-card', {
        scrollTrigger: {
          trigger: '.finder-card',
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
      })

      const counterElements = gsap.utils.toArray('.counter-num')
      counterElements.forEach((el) => {
        const targetVal = parseFloat(el.getAttribute('data-target'))
        const isDecimal = el.getAttribute('data-target').includes('.')

        gsap.fromTo(
          el,
          { textContent: 0 },
          {
            textContent: targetVal,
            duration: 1.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
            snap: { textContent: isDecimal ? 0.1 : 1 },
          }
        )
      })

      const colorTransitions = [
        { trigger: '#top', bg: '#080808', color: '#ffffff' },
        { trigger: '#network', bg: '#ffffff', color: '#090909' },
        { trigger: '#donate', bg: '#080808', color: '#ffffff' },
        { trigger: '#intelligence', bg: '#ffffff', color: '#090909' },
        { trigger: '#impact', bg: '#080808', color: '#ffffff' },
        { trigger: '#access', bg: '#ffffff', color: '#090909' },
        { trigger: '#footer', bg: '#080808', color: '#ffffff' },
      ]

      colorTransitions.forEach(({ trigger, bg, color }) => {
        ScrollTrigger.create({
          trigger,
          start: 'top 55%',
          end: 'bottom 55%',
          onEnter: () => {
            gsap.to(mainRef.current, {
              backgroundColor: bg,
              color: color,
              duration: 0.6,
              ease: 'power2.out',
            })
          },
          onEnterBack: () => {
            gsap.to(mainRef.current, {
              backgroundColor: bg,
              color: color,
              duration: 0.6,
              ease: 'power2.out',
            })
          },
        })
      })
    }, mainRef)

    return () => ctx.revert()
  }, [path])

  const handleHeroParallax = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5

    event.currentTarget.style.setProperty('--mouse-x', x.toFixed(3))
    event.currentTarget.style.setProperty('--mouse-y', y.toFixed(3))
  }

  const resetHeroParallax = (event) => {
    event.currentTarget.style.setProperty('--mouse-x', '0')
    event.currentTarget.style.setProperty('--mouse-y', '0')
  }

  const enterPortal = (role) => {
    const cleanRole = (role || '').toLowerCase().replace(/[^a-z]/g, '')
    let nextPath = '/donor'

    if (cleanRole.includes('hospital')) nextPath = '/hospital'
    else if (cleanRole.includes('bank') || cleanRole.includes('bloodbank')) nextPath = '/bloodbank'
    else if (cleanRole.includes('admin')) nextPath = '/admin'

    if (!currentUser) {
      setIntendedRole(role)
      openAuth('login', role)
      return
    }

    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    window.scrollTo(0, 0)
  }

  const goHome = () => {
    if (currentUser) {
      const dest = getDashboardPath(currentUser.role)
      window.history.replaceState({}, '', dest)
      setPath(dest)
      window.scrollTo(0, 0)
      return
    }
    window.history.pushState({}, '', '/')
    setPath('/')
    window.scrollTo(0, 0)
  }

  const handleLogout = () => {
    localStorage.removeItem('vital_user')
    localStorage.removeItem('vital_token')
    setCurrentUser(null)
    setIntendedRole(null)
    window.history.pushState({}, '', '/')
    setPath('/')
    window.scrollTo(0, 0)
  }

  const openAuth = (mode = 'login', role = 'Donor') => {
    const roleParam = encodeURIComponent(role)
    window.history.pushState({}, '', `/auth?mode=${mode}&role=${roleParam}`)
    setPath('/auth')
    window.scrollTo(0, 0)
  }

  const openCamps = () => {
    window.history.pushState({}, '', '/camps')
    setPath('/camps')
    window.scrollTo(0, 0)
  }

  const openFeedback = () => {
    window.history.pushState({}, '', '/feedback')
    setPath('/feedback')
    window.scrollTo(0, 0)
  }

  const handleAuthSuccess = (userData) => {
    setCurrentUser(userData)
    localStorage.setItem('vital_user', JSON.stringify(userData))

    const targetRole = intendedRole || userData.role || 'Donor'
    setIntendedRole(null)

    const nextPath = getDashboardPath(targetRole)
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    window.scrollTo(0, 0)
  }

  const handleNavClick = (entry, event) => {
    if (event) event.preventDefault()
    setMenuOpen(false)
    setActiveMenu(null)

    if (entry.type === 'portal') {
      enterPortal(entry.portal)
    } else if (entry.type === 'page') {
      if (entry.page === '/camps') openCamps()
      else if (entry.page === '/feedback') openFeedback()
    } else if (entry.type === 'scroll') {
      if (path !== '/') {
        goHome()
        setTimeout(() => {
          document.getElementById(entry.target)?.scrollIntoView({ behavior: 'smooth' })
        }, 120)
      } else {
        document.getElementById(entry.target)?.scrollIntoView({ behavior: 'smooth' })
      }
    } else if (entry.type === 'link' && entry.href) {
      window.location.href = entry.href
    }
  }

  const renderDashboardByRole = () => {
    if (!currentUser) return null

    const cleanRole = (currentUser.role || '').toLowerCase().replace(/[^a-z]/g, '')

    switch (cleanRole) {
      case 'hospital':
        return (
          <div>
            <HospitalDashboard user={currentUser} onBack={handleLogout} />

            <div style={{ position: 'fixed', bottom: '24px', right: '90px', zIndex: 90 }}>
              <button
                type="button"
                className="glow-on-hover"
                onClick={() => setShowHospitalQuickReq(true)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)',
                }}
              >
                <Siren size={18} /> Quick Emergency Request
              </button>
            </div>

            {showHospitalQuickReq && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}
                onClick={() => setShowHospitalQuickReq(false)}
              >
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    maxWidth: '460px',
                    width: '100%',
                    padding: '24px',
                    position: 'relative',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Siren size={18} />
                      </span>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                        Broadcast Blood Need
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowHospitalQuickReq(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                      }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleActivateRequest}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                        Required Blood Group
                      </label>
                      <select
                        value={hospitalBloodGroup}
                        onChange={(e) => setHospitalBloodGroup(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      >
                        {['O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'].map((g) => (
                          <option key={g} value={g}>
                            {g} Blood Group
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                          Units Required
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={unitsNeeded}
                          onChange={(e) => setUnitsNeeded(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                          Urgency
                        </label>
                        <select
                          value={urgency}
                          onChange={(e) => setUrgency(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        >
                          <option value="Critical Trauma">Critical Trauma</option>
                          <option value="Urgent">Urgent</option>
                          <option value="Scheduled Surgery">Scheduled Surgery</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                        Patient Location / Clinical Condition
                      </label>
                      <input
                        type="text"
                        value={patientNote}
                        onChange={(e) => setPatientNote(e.target.value)}
                        placeholder="e.g. ICU Bay 4, Severe blood loss"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="glow-on-hover"
                      disabled={isSubmittingReq}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: isSubmittingReq ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingReq ? 0.7 : 1,
                      }}
                    >
                      {isSubmittingReq ? 'Broadcasting Alert...' : 'Activate Request'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )

      case 'bloodbank':
      case 'bank':
        return <BloodBankDashboard user={currentUser} onBack={handleLogout} />

      case 'admin':
      case 'administrator':
        return (
          <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 60px' }}>
            <AdminDashboard user={currentUser} onBack={handleLogout} />

            <div style={{ marginTop: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '18px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                    Camp Accreditation Desk
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                    Review community-submitted blood drives before publication
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAdminCampProposals}
                  style={{
                    padding: '7px 14px',
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  ↻ Refresh Desk
                </button>
              </div>

              {isQueueLoading ? (
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>Querying MongoDB Compass for pending proposals...</p>
              ) : adminCampQueue.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #f3f4f6',
                  }}
                >
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                    No pending blood camp requests awaiting your review.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {adminCampQueue.map((camp) => (
                    <div
                      key={camp._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        padding: '20px',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#b45309',
                              background: '#fef3c7',
                              padding: '3px 8px',
                              borderRadius: '99px',
                            }}
                          >
                            {camp.status || 'Pending'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            📅 {camp.preferredDate ? new Date(camp.preferredDate).toLocaleDateString() : 'Date Pending'}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                          {camp.campName}
                        </h4>
                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#374151' }}>
                          <strong>Organizer:</strong> {camp.organizer}
                        </p>
                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#374151' }}>
                          <strong>Expected Turnout:</strong> {camp.expectedDonors} Donors
                        </p>
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
                          📍 {camp.venue}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleDecideCamp(camp._id, 'Medically Verified')}
                          style={{
                            flex: 1,
                            padding: '9px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#16a34a',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Sanction Drive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecideCamp(camp._id, 'Rejected')}
                          style={{
                            flex: 1,
                            padding: '9px',
                            borderRadius: '8px',
                            border: '1px solid #fee2e2',
                            background: '#fff',
                            color: '#dc2626',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 'donor':
      default:
        return (
          <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 60px' }}>
            <DonorDashboard user={currentUser} onBack={handleLogout} />

            <div className="donor-live-feed-section" style={{ marginTop: '36px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                    Active Hospital Requirements
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    Filtered for blood compatibility ({currentUser.bloodGroup || 'All Compatible'})
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    District:
                  </span>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value)
                      fetchDonorEmergencyFeed(e.target.value)
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer',
                      backgroundColor: '#ffffff',
                      fontWeight: 600,
                    }}
                  >
                    <option value="Kamareddy">Kamareddy</option>
                    <option value="Nizamabad">Nizamabad</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Medak">Medak</option>
                  </select>
                </div>
              </div>

              {isLoadingRequests ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Scanning regional blood requests...
                </p>
              ) : donorRequests.length === 0 ? (
                <div
                  style={{
                    padding: '28px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                    No open hospital requirements in {selectedDistrict} right now.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '18px',
                  }}
                >
                  {donorRequests.map((req) => (
                    <div
                      key={req._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fee2e2',
                        borderRadius: '16px',
                        padding: '20px',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                          }}
                        >
                          <span
                            style={{
                              backgroundColor: '#fef2f2',
                              color: '#b91c1c',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: '99px',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {req.urgencyLevel || 'URGENT'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            📍 {req.district}
                          </span>
                        </div>
                        <h4
                          style={{
                            margin: '0 0 6px',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#0f172a',
                          }}
                        >
                          {req.hospitalName}
                        </h4>
                        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#475569' }}>
                          Condition: {req.patientCondition || 'Emergency Trauma'}
                        </p>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#0f172a',
                            fontWeight: 600,
                            marginBottom: '16px',
                          }}
                        >
                          Needed:{' '}
                          <span style={{ color: '#b91c1c' }}>
                            {req.unitsRequired} Units ({req.bloodGroup})
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="glow-on-hover"
                        onClick={() => handleCommitDonation(req._id, req.hospitalName)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: '#111827',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Respond & Donate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  if (currentUser && (path === '/' || path === '/auth')) {
    return renderDashboardByRole()
  }

  if (currentUser) {
    if (path === '/hospital' || path === '/bloodbank' || path === '/admin' || path === '/donor') {
      return renderDashboardByRole()
    }
  }

  if (path === '/camps') return <BloodCampsPage onBack={goHome} />
  if (path === '/feedback') return <FeedbackPage onBack={goHome} />
  if (path === '/auth') {
    return (
      <AuthPage
        initialMode={new URLSearchParams(window.location.search).get('mode') || 'login'}
        initialRole={new URLSearchParams(window.location.search).get('role') || intendedRole || 'Donor'}
        onAuthSuccess={handleAuthSuccess}
        onBack={goHome}
      />
    )
  }

  return (
    <main ref={mainRef} className="gsap-scroll-canvas">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {/* PWA / Web APK Installation Prompt */}
      <InstallAppBanner />

      <nav className="nav shell">
        <a className="brand" href="#top" onClick={goHome}>
          <span className="brand-mark">
            <Droplets size={20} />
          </span>

          <span>
            VitalConnect<span>AI</span>
          </span>
        </a>

        <div className={menuOpen ? 'nav-links open' : 'nav-links'}>
          {navigationItems.map((item) => (
            <div
              className="nav-item"
              key={item.label}
              onMouseEnter={() => setActiveMenu(item.label)}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <a
                href={item.href}
                onClick={(e) => handleNavClick(item, e)}
              >
                {item.label}
              </a>

              {activeMenu === item.label && (
                <div className="nav-submenu">
                  {item.items.map((subItem) => (
                    <a
                      href="#"
                      key={subItem.label}
                      onClick={(e) => handleNavClick(subItem, e)}
                    >
                      {subItem.label}
                      <ChevronRight size={14} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown)
                if (!showNotifDropdown && unreadCount > 0 && typeof markAllAsRead === 'function') {
                  markAllAsRead()
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                padding: '8px',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
              aria-label="Toggle notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 800,
                    borderRadius: '99px',
                    padding: '2px 5px',
                    minWidth: '16px',
                    textAlign: 'center',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: '320px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                  border: '1px solid #e2e8f0',
                  zIndex: 9999,
                  padding: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '8px',
                  }}
                >
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Notifications</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {notifications.length} recent
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                    No new alerts
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id || n.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: n.isRead ? '#ffffff' : '#fef2f2',
                        marginBottom: '6px',
                        border: n.isRead ? '1px solid #f8fafc' : '1px solid #fee2e2',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                          {n.title}
                        </span>
                        <small style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {n.createdAt
                            ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </small>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                        {n.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="kamil-purple-btn"
            onClick={() => openAuth('register', 'Donor')}
          >
            <div className="left" />
            <span className="btn-label">REGISTER</span>
            <div className="right" />
          </button>
        </div>

        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      <section
        className="hero shell"
        id="top"
        onMouseMove={handleHeroParallax}
        onMouseLeave={resetHeroParallax}
      >
        <div className="hero-copy">
          <h1>
            Precision care.
            <br />
            <em>Human impact.</em>
          </h1>

          <p className="hero-text">
            VitalConnectAI connects the people and institutions behind every
            life-saving decision — in real time, with extraordinary clarity.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="button button-primary glow-on-hover"
              onClick={() => enterPortal('Donor')}
            >
              Become a donor <ArrowRight size={17} />
            </button>

            <a className="text-link" href="#network">
              Explore the network <ChevronRight size={17} />
            </a>
          </div>

          <div className="trust-row">
            <div className="avatar-stack">
              <span>AK</span>
              <span>JM</span>
              <span>RP</span>
              <span>+</span>
            </div>

            <p>
              <strong>10,000+</strong> people have joined a more responsive
              care system.
            </p>
          </div>
        </div>

        <div
          className="hero-visual"
          aria-label="VitalConnectAI real-time response network"
        >
          <img
            className="hero-network-image"
            src="/images/network-response.png"
            alt="VitalConnectAI real-time blood care response network"
          />
        </div>
      </section>

      <section className="roles shell" id="network">
        <div className="section-heading">
          <p className="eyebrow">Find verified support</p>

          <h2>
            Find blood when
            <br />
            every <em>moment matters.</em>
          </h2>

          <p className="section-copy">
            Search trusted blood banks, hospitals, and donors through one
            verified network.
          </p>
        </div>

        <div className="finder-card">
          <div className="finder-inline-row">
            <div className="finder-field finder-field-group">
              <label>What blood group do you need?</label>
              <div className="finder-control">
                <Droplets size={17} className="control-icon" />
                <select
                  value={selectedBloodGroup}
                  onChange={(e) => setSelectedBloodGroup(e.target.value)}
                  className="finder-select-input"
                >
                  <option value="" disabled>
                    Select Blood Group
                  </option>
                  <option value="O+">O+ Blood Group</option>
                  <option value="O−">O− Blood Group</option>
                  <option value="A+">A+ Blood Group</option>
                  <option value="A−">A− Blood Group</option>
                  <option value="B+">B+ Blood Group</option>
                  <option value="B−">B− Blood Group</option>
                  <option value="AB+">AB+ Blood Group</option>
                  <option value="AB−">AB− Blood Group</option>
                </select>
              </div>
            </div>

            <span className="finder-divider" />

            <div className="finder-field finder-field-location" style={{ position: 'relative' }}>
              <label>Location (City / District / Area)</label>
              <div className="finder-control">
                <MapPin size={17} className="control-icon" />
                <input
                  type="text"
                  value={locationText}
                  placeholder="e.g. Gandhari, Nizamabad, Kamareddy"
                  onChange={handleLocationInputChange}
                  onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="finder-text-input"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="finder-gps-pill"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  title="Detect nearest district automatically"
                >
                  <Navigation size={12} />
                  <span>{isDetectingLocation ? 'Locating...' : 'GPS'}</span>
                </button>
              </div>

              {showSuggestions && locationSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                    border: '1px solid #e2e8f0',
                    marginTop: '6px',
                    zIndex: 9999,
                    overflow: 'hidden',
                  }}
                >
                  {locationSuggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      onMouseDown={() => selectSuggestedLocation(suggestion)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#1e293b',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <MapPin size={14} style={{ color: '#dc2626' }} />
                      <strong style={{ fontWeight: 600 }}>{suggestion}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="finder-submit-button glow-on-hover"
              onClick={handlePublicSearch}
              disabled={isSearching}
            >
              <span>{isSearching ? 'Searching...' : 'Search now'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="role-grid">
          {roles.map(({ icon: Icon, title, label, copy, tone }) => (
            <article className={`role-card ${tone}`} key={title}>
              <div className="role-top">
                <span className="role-icon">
                  <Icon size={22} />
                </span>

                <ArrowUpRight size={19} />
              </div>

              <h3>{title}</h3>
              <p className="role-label">{label}</p>
              <p className="role-copy">{copy}</p>

              <button type="button" onClick={() => enterPortal(title)}>
                Enter portal <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="donate shell" id="donate">
        <div className="donate-image">
          <img
            className="donation-impact-image"
            src="/images/donation-impact.png"
            alt="One donation can save three lives"
          />
        </div>

        <div className="donate-copy">
          <p className="eyebrow">Donate blood</p>

          <h2>
            Your generosity
            <br />
            keeps care <em>moving.</em>
          </h2>

          <p>
            In less than an hour, you can make a life-saving difference. We
            will guide you through every calm, safe, and verified step.
          </p>

          <div className="donate-steps">
            <span><b>01</b> Check your eligibility</span>
            <span><b>02</b> Find a time near you</span>
            <span><b>03</b> Donate with confidence</span>
          </div>

          <button
            type="button"
            className="button button-primary glow-on-hover"
            onClick={() => enterPortal('Donor')}
          >
            Start your donation journey <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <section className="intelligence shell" id="intelligence">
        <div className="intelligence-copy">
          <p className="eyebrow">Blood camps near you</p>

          <h2>
            Meet your next
            <br />
            chance to <em>give.</em>
          </h2>

          <p>
            Discover verified blood camps led by trusted hospitals and blood
            banks. Choose a location, reserve a time, and arrive prepared.
          </p>

          <button
            type="button"
            className="button button-primary camp-pill-cta glow-on-hover"
            onClick={openCamps}
          >
            Explore blood camps <ArrowRight size={17} />
          </button>
        </div>

        <div className="dashboard">
          <div className="dash-head">
            <div>
              <small>Upcoming camps</small>
              <strong>
                {locationText !== 'Use my location' &&
                locationText !== 'Location permission denied' &&
                locationText !== 'Geolocation not supported'
                  ? `Available near ${locationText}`
                  : 'Location required'}
              </strong>
            </div>

            {locationText !== 'Use my location' &&
              locationText !== 'Location permission denied' &&
              locationText !== 'Geolocation not supported' && (
                <span className="dash-live">
                  <i /> Verified
                </span>
              )}
          </div>

          {locationText !== 'Use my location' &&
          locationText !== 'Location permission denied' &&
          locationText !== 'Geolocation not supported' ? (
            <>
              <div className="camp-list">
                <article>
                  <span><CalendarDays size={18} /></span>

                  <div>
                    <strong>CityCare Donation Drive</strong>
                    <p>Saturday · 9:00 AM – 4:00 PM</p>
                  </div>

                  <button type="button" onClick={openCamps}>View</button>
                </article>

                <article>
                  <span><MapPin size={18} /></span>

                  <div>
                    <strong>Central Community Hall</strong>
                    <p>4.8 km away · 18 slots left</p>
                  </div>

                  <button type="button" onClick={openCamps}>Reserve</button>
                </article>
              </div>

              <div className="dash-footer">
                <span>
                  <Check size={14} /> All camps are verified
                </span>

                <span style={{ cursor: 'pointer' }} onClick={openCamps}>
                  View full calendar →
                </span>
              </div>
            </>
          ) : (
            <div style={{ padding: '36px 12px', textAlign: 'center' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#e9efe7',
                  color: '#507a5e',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <MapPin size={20} />
              </div>
              <strong style={{ display: 'block', fontSize: '14px', color: '#173a39' }}>
                No location selected
              </strong>
              <p style={{ fontSize: '12px', color: '#6c8581', margin: '6px 0 16px', lineHeight: 1.5 }}>
                Select your location in the <strong>Find Blood</strong> section above to discover blood camps nearby.
              </p>
              <button
                type="button"
                onClick={() => {
                  document.getElementById('network')?.scrollIntoView({ behavior: 'smooth' })
                }}
                style={{
                  border: 0,
                  background: '#111',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '9px 15px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Select location ↑
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="impact shell" id="impact">
        <div className="impact-statement">
          <p className="eyebrow">A network in motion</p>

          <h2>
            Every connection
            <br />
            has a <em>heartbeat.</em>
          </h2>
        </div>

        <div className="metrics">
          <div>
            <strong>
              <span className="counter-num" data-target="24">0</span>
              <small>/7</small>
            </strong>
            <p>always-on coordination</p>
          </div>

          <div>
            <strong>
              <span className="counter-num" data-target="4.8">0</span>
              <small>x</small>
            </strong>
            <p>faster response routing</p>
          </div>

          <div>
            <strong>
              <span className="counter-num" data-target="99.9">0</span>
              <small>%</small>
            </strong>
            <p>data integrity commitment</p>
          </div>
        </div>
      </section>

      <section className="access shell" id="access">
        <div className="faq-copy">
          <p className="eyebrow">FAQs & feedback</p>

          <h2>
            Questions deserve
            <br />
            clear <em>answers.</em>
          </h2>

          <p>
            Everything you need to know before donating, requesting blood, or
            joining the VitalConnectAI network.
          </p>

          <button
            type="button"
            className="button button-primary glow-on-hover"
            onClick={openFeedback}
          >
            Share your feedback <ArrowRight size={17} />
          </button>
        </div>

        <div className="faq-list">
          <details open>
            <summary>
              Who can donate blood?
              <ChevronRight size={17} />
            </summary>

            <p>
              Most healthy adults can donate after a short eligibility review
              at a verified donation centre.
            </p>
          </details>

          <details>
            <summary>
              How do I request urgent blood?
              <ChevronRight size={17} />
            </summary>

            <p>
              Use Find Blood to reach verified hospitals and blood banks in
              your area.
            </p>
          </details>

          <details>
            <summary>
              Is my information kept private?
              <ChevronRight size={17} />
            </summary>

            <p>
              Yes. Your personal information is protected and shared only when
              required for verified care coordination.
            </p>
          </details>
        </div>
      </section>

      <footer className="footer shell" id="footer">
        <div className="footer-top-row">
          <div className="footer-brand">
            <a className="brand" href="#top" onClick={goHome}>
              <span className="brand-mark">
                <Droplets size={20} />
              </span>
              <span>
                VitalConnect<span>AI</span>
              </span>
            </a>
            <p>© 2026 VitalConnectAI. Precision care, human impact.</p>
          </div>

          <div className="contact-block-wide">
            <div className="contact-dev-header">
              <div className="contact-dev-avatar-row">
                <img
                  src="/images/vignesh-profile.jpg"
                  alt="Poloji Vignesh"
                  className="contact-dev-photo"
                />
                <div>
                  <strong>Poloji Vignesh</strong>
                  <span>Web Developer</span>
                </div>
              </div>
            </div>

            <div className="contact-split-grid">
              <div className="contact-col">
                <a href="mailto:vigneshpoloji@gmail.com">
                  <Mail size={15} />
                  vigneshpoloji@gmail.com
                </a>
                <a href="tel:+917569876200">
                  <Phone size={15} />
                  +91 75698 76200
                </a>
              </div>

              <div className="contact-col">
                <a
                  href="https://wa.me/917569876200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={15} />
                  WhatsApp (+91 75698 76200)
                </a>
                <a
                  href="https://www.linkedin.com/in/poloji-vignesh-50a3b3287"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ArrowUpRight size={15} />
                  LinkedIn Profile
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-sitemap">
          {navigationItems.map((section) => (
            <div key={section.label} className="sitemap-col">
              <a
                href="#"
                className="sitemap-heading"
                onClick={(e) => handleNavClick(section, e)}
              >
                {section.label}
              </a>

              <div className="sitemap-subitems">
                {section.items.map((sub) => (
                  <a
                    href="#"
                    key={sub.label}
                    className="sitemap-sublink"
                    style={{ textDecoration: 'none', color: '#666', fontSize: '11px', cursor: 'pointer' }}
                    onClick={(e) => handleNavClick(sub, e)}
                  >
                    {sub.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-links">
            <a href="#top">Privacy Policy</a>
            <a href="#top">Terms of Service</a>
            <a
              href="#access"
              onClick={(e) => {
                e.preventDefault()
                openFeedback()
              }}
            >
              Feedback
            </a>
          </div>
          <span className="secure-badge">
            <ShieldCheck size={14} /> End-to-End Care Coordination
          </span>
        </div>
      </footer>

      {showSearchModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowSearchModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#bd1230', textTransform: 'uppercase' }}>
                  Live Inventory Network
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '20px', color: '#111' }}>
                  {selectedBloodGroup} Stock in {locationText !== 'Use my location' ? locationText.replace(/\(.*?\)/g, '').trim() : (selectedDistrict || 'Kamareddy')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={20} />
              </button>
            </div>

            {isSearching ? (
              <p style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Scanning connected cold-storage reserves...</p>
            ) : !searchResults || searchResults.results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f9f6f7', borderRadius: '12px' }}>
                <Droplets size={32} style={{ color: '#bd1230', margin: '0 auto 10px', display: 'block' }} />
                <strong style={{ color: '#111' }}>No verified stock found in this area</strong>
                <p style={{ fontSize: '13px', color: '#666', margin: '6px 0 16px' }}>
                  No blood banks currently report reserve units for {selectedBloodGroup} matching your search location.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(false)
                    setHospitalBloodGroup(selectedBloodGroup)
                    if (currentUser && currentUser.role?.toLowerCase().includes('hospital')) {
                      setShowHospitalQuickReq(true)
                    } else {
                      enterPortal('Hospital')
                    }
                  }}
                  style={{
                    padding: '10px 18px',
                    background: '#bd1230',
                    color: '#fff',
                    border: 0,
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Broadcast Emergency Request for {selectedBloodGroup} →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.results.map((bank) => (
                  <div
                    key={bank.id}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid #efe4e6',
                      background: '#fff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '15px', color: '#111' }}>{bank.facilityName}</strong>
                        {bank.distanceKm !== null && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '99px',
                            }}
                          >
                            {bank.distanceKm} km away
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '3px 0', fontSize: '12px', color: '#665' }}>📍 {bank.address}</p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <a
                          href={`tel:${(bank.phone || '').replace(/\s+/g, '')}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#bd1230',
                            fontSize: '12px',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Phone size={13} /> {bank.phone}
                        </a>

                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            `${bank.facilityName},${bank.address}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#0284c7',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            background: '#f0f9ff',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          <Navigation size={11} /> Directions
                        </a>

                        <a
                          href={`https://wa.me/${(bank.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hello ${bank.facilityName}, inquiring about the immediate availability of${selectedBloodGroup} blood units via VitalConnectAI.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#16a34a',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            background: '#f0fdf4',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 800,
                          background: bank.availableUnits > 3 ? '#ecfdf5' : '#fff1f2',
                          color: bank.availableUnits > 3 ? '#047857' : '#be123c',
                        }}
                      >
                        {bank.availableUnits} units available
                      </span>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(false)
                    enterPortal('Donor')
                  }}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '12px',
                    background: '#111',
                    color: '#fff',
                    border: 0,
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Want to donate {selectedBloodGroup}? Enter Donor Portal →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ai-assistant">
        {botOpen && (
          <section className="bot-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="bot-header">
              <span>
                <Sparkles size={15} />
                VitalAI assistant
              </span>

              <button type="button" onClick={() => setBotOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div 
              className="bot-body" 
              ref={botBodyRef}
              style={{ 
                flex: 1, 
                maxHeight: '320px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px', 
                padding: '14px',
                background: '#faf9f9'
              }}
            >
              {landingBotMessages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    padding: '8px 12px',
                    borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: m.sender === 'user' ? '#bd1230' : '#ffffff',
                    color: m.sender === 'user' ? '#ffffff' : '#1e1417',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    border: m.sender === 'user' ? 'none' : '1px solid #eee4e7',
                  }}
                >
                  {m.text}
                </div>
              ))}

              {isLandingBotThinking && (
                <div style={{ alignSelf: 'flex-start', color: '#887', fontSize: '11px', padding: '4px' }}>
                  VitalAI is typing...
                </div>
              )}
            </div>

            <form 
              className="bot-prompt" 
              onSubmit={handleLandingBotSend}
              style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderTop: '1px solid #f0e6e9' }}
            >
              <input
                type="text"
                value={landingBotInput}
                onChange={(e) => setLandingBotInput(e.target.value)}
                placeholder="Ask VitalAI anything..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '12px',
                  color: '#1a1316',
                }}
              />

              <button
                type="submit"
                disabled={!landingBotInput.trim() || isLandingBotThinking}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: !landingBotInput.trim() || isLandingBotThinking ? 'not-allowed' : 'pointer',
                  opacity: !landingBotInput.trim() || isLandingBotThinking ? 0.4 : 1,
                  color: '#bd1230',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </section>
        )}

        <button
          type="button"
          className="bot-trigger"
          onClick={() => setBotOpen(!botOpen)}
          aria-label="Open AI Assistant"
        >
          <MessageCircle size={22} />
          <i />
        </button>
      </div>
    </main>
  )
}