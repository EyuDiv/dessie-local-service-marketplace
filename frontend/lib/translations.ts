export type Language = 'en' | 'am';

export interface Translations {
  brandTitle: string;
  brandSubtitle: string;
  heroTitle: string;
  heroIntro: string;
  servicesHeading: string;
  services: string[];
  conciseNote: string;
  leftAlreadyText: string;
  leftSignInLink: string;
  quickTestLabel: string;
  quickCustomer: string;
  quickProvider: string;
  quickLogin: string;
  tabRegisterText: string;
  tabLoginText: string;
  formHeaderTitleRegister: string;
  formHeaderSubtitleRegister: string;
  formHeaderTitleLogin: string;
  formHeaderSubtitleLogin: string;
  roleLabel: string;
  roleCustomerTitle: string;
  roleCustomerSub: string;
  roleProviderTitle: string;
  roleProviderSub: string;
  labelName: string;
  namePlaceholder: string;
  labelEmail: string;
  emailPlaceholder: string;
  labelPhone: string;
  phonePlaceholder: string;
  labelPassword: string;
  labelConfirmPassword: string;
  labelBusiness: string;
  businessPlaceholder: string;
  labelLocation: string;
  locationPlaceholder: string;
  labelExperience: string;
  experiencePlaceholder: string;
  labelDescription: string;
  descPlaceholder: string;
  termsNoticePrefix: string;
  termsNoticeAnd: string;
  termsNoticeSuffix: string;
  termsOfService: string;
  privacyPolicy: string;
  btnRegisterText: string;
  btnRegisterLoading: string;
  btnLoginText: string;
  btnLoginLoading: string;
  bottomAlreadyText: string;
  bottomSignInLink: string;
  bottomNoAccountText: string;
  bottomRegisterLink: string;
  labelLoginEmail: string;
  loginEmailPlaceholder: string;
  labelLoginPassword: string;
  footerCopyright: string;
  footerPrivacy: string;
  footerTerms: string;
  footerSupport: string;
  successNoticeTitle: string;
  successNoticeDesc: string;
  loginSuccessNoticeTitle: string;
  loginSuccessNoticeDesc: string;
  logoutSuccessTitle: string;
  dashboardCustomer: string;
  dashboardCustomerSubtitle: string;
  dashboardProvider: string;
  dashboardProviderSubtitle: string;
  dashboardAdmin: string;
  dashboardAdminSubtitle: string;
  dashboardPlaceholder: string;
  callProviderBtn: string;
  providerPhoneLabel: string;
  statusPendingVerification: string;
  pendingVerificationNotice: string;
  labelCvUpload: string;
  cvUploadHelp: string;
  labelCertificateUpload: string;
  certificateUploadHelp: string;
  fileSelected: string;
  btnRemoveFile: string;
  btnChooseFile: string;
  btnReplaceFile: string;
  dragDropText: string;
  errCvInvalidType: string;
  errCvTooLarge: string;
  errCertificateInvalidType: string;
  errCertificateTooLarge: string;
  uploadingFiles: string;
  adminProvidersTitle: string;
  adminProvidersSubtitle: string;
  filterAllProviders: string;
  filterPendingProviders: string;
  filterVerifiedProviders: string;
  filterRejectedProviders: string;
  colBusiness: string;
  colContact: string;
  colExperience: string;
  colDocuments: string;
  colStatus: string;
  colActions: string;
  badgeHasCv: string;
  badgeNoCv: string;
  badgeHasCert: string;
  badgeNoCert: string;
  btnViewCv: string;
  btnViewCertificate: string;
  btnApprove: string;
  btnReject: string;
  confirmApproveTitle: string;
  confirmApproveMsg: string;
  confirmRejectTitle: string;
  confirmRejectMsg: string;
  rejectionReasonLabel: string;
  rejectionReasonPlaceholder: string;
  statusRejected: string;
  rejectionNoticeTitle: string;
  rejectionNoticeDesc: string;
  reUploadCvBtn: string;
  cvUploadedSuccess: string;
  emptyProviders: string;
  loadingDocument: string;
  dashWelcome: string;
  dashTotalRequests: string;
  dashActiveRequests: string;
  dashCompletedRequests: string;
  dashVerifiedPros: string;
  dashRecentRequests: string;
  dashNoRequests: string;
  dashNoRequestsSub: string;
  dashQuickActions: string;
  dashPopularCategories: string;
  dashIncomingJobs: string;
  dashNoIncomingJobs: string;
  dashManageServices: string;
  dashAddService: string;
  dashAvailability: string;
  dashAcceptJob: string;
  dashDeclineJob: string;
  dashStartJob: string;
  dashCompleteJob: string;
  dashboardUser: string;
  dashboardRole: string;
  dashboardEmail: string;
  btnLogout: string;
  btnLogoutLoading: string;
  navDashboard: string;
  navFindService: string;
  navMyRequests: string;
  navProfile: string;
  navSignOut: string;
  locationTag: string;
  findServiceTitle: string;
  findServiceSubtitle: string;
  verifiedNetworkPill: string;
  searchPlaceholder: string;
  searchBtn: string;
  pillAllServices: string;
  filterLocationLabel: string;
  filterAvailabilityLabel: string;
  optAllLocations: string;
  optAllAvailability: string;
  optAvailable: string;
  optBusy: string;
  optOffline: string;
  showingPrefix: string;
  showingSuffix: string;
  badgeVerified: string;
  btnViewProfile: string;
  statusAvailable: string;
  statusBusy: string;
  statusOffline: string;
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  emptyResetBtn: string;
  searchResultsFor: string;
  searchClearBtn: string;
  searchNoResultsFound: string;
  searchNoResultsDesc: string;
  errorTitle: string;
  errorSubtitle: string;
  errorRetryBtn: string;
  experienceYearsSuffix: string;
  findServiceBtn: string;
  backToServices: string;
  aboutProviderTitle: string;
  servicesOfferedTitle: string;
  experienceLabel: string;
  yearsExperience: string;
  customerReviewsTitle: string;
  customerReviewsSubtitle: string;
  noReviewsYet: string;
  noReviewsYetDesc: string;
  requestServiceBtn: string;
  coordinateRequestTitle: string;
  coordinateRequestSub: string;
  noDescriptionProvided: string;
  providerNotFoundTitle: string;
  providerNotFoundDesc: string;
  providerLoading: string;
  providerErrorTitle: string;
  providerErrorSubtitle: string;
  verifiedProTag: string;
  verifiedCustomerTag: string;
  activeSpecialtiesSuffix: string;
  servicesIntroSub: string;
  customerPrivacyNote: string;

  // Service Request Creation (Step 14)
  requestServicePageTitle: string;
  requestServiceStepLabel: string;
  requestServiceSubtitlePrefix: string;
  requestServiceSubtitleSuffix: string;
  backToProviderProfile: string;
  selectedServiceLabel: string;
  serviceLockedHint: string;
  lblWorkDescription: string;
  phWorkDescription: string;
  helperWorkDescription: string;
  lblServiceLocation: string;
  phServiceLocation: string;
  helperServiceLocation: string;
  lblRequestedDate: string;
  lblRequestedTime: string;
  phRequestedTime: string;
  reqTag: string;
  infoNoticeText: string;
  btnSubmitRequest: string;
  btnSendingRequest: string;
  btnCancel: string;
  requestLoadingTitle: string;
  requestLoadingSubtitle: string;
  requestSuccessTitle: string;
  requestSuccessDesc: string;
  btnViewMyRequests: string;
  btnBackToDashboard: string;
  refSummaryHeading: string;
  statusPendingTag: string;
  errDescRequired: string;
  errLocRequired: string;
  errDateRequired: string;
  errTimeRequired: string;
  errSubmissionTitle: string;
  errSubmissionDesc: string;
  btnTryAgain: string;
  errInvalidProvider: string;
  errInvalidService: string;
  errProviderNotVerified: string;
  availableForWorkBadge: string;
  busyForWorkBadge: string;
  offlineForWorkBadge: string;
  myRequestsPlaceholderTitle: string;
  myRequestsPlaceholderDesc: string;

  errors: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirm: string;
    business: string;
    location: string;
    experience: string;
    description: string;
    loginEmail: string;
    loginPassword: string;
    genericError: string;
    networkError: string;
    invalidCredentials: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    brandTitle: "Dessie Local",
    brandSubtitle: "Local Service Marketplace",
    heroTitle: "Find trusted local services in Dessie.",
    heroIntro: "Create an account to find reliable service providers or offer your own services in Dessie.",
    servicesHeading: "Available Categories",
    services: [
      "Plumbing",
      "Electrical",
      "Cleaning",
      "Photography",
      "Computer Repair",
      "Tutoring",
      "Painting",
      "Carpentry"
    ],
    conciseNote: "Direct communication with local service providers in Dessie.",
    leftAlreadyText: "Already registered?",
    leftSignInLink: "Sign In",
    quickTestLabel: "Quick View Modes:",
    quickCustomer: "Customer Register",
    quickProvider: "Provider Register",
    quickLogin: "Sign In",
    tabRegisterText: "Create Account",
    tabLoginText: "Sign In",
    formHeaderTitleRegister: "Create Account",
    formHeaderSubtitleRegister: "Choose how you want to use the platform to get started.",
    formHeaderTitleLogin: "Welcome Back",
    formHeaderSubtitleLogin: "Enter your credentials to access your Dessie Local account.",
    roleLabel: "I want to:",
    roleCustomerTitle: "Find Services",
    roleCustomerSub: "For Customers",
    roleProviderTitle: "Offer Services",
    roleProviderSub: "For Service Providers",
    labelName: "Full Name",
    namePlaceholder: "e.g. Almaz Tadesse",
    labelEmail: "Email Address",
    emailPlaceholder: "name@example.com",
    labelPhone: "Phone Number",
    phonePlaceholder: "+251 91 123 4567",
    labelPassword: "Password",
    labelConfirmPassword: "Confirm Password",
    labelBusiness: "Business Name",
    businessPlaceholder: "e.g. Tadesse Plumbing Solutions",
    labelLocation: "Location / Dessie Sub-City / Area",
    locationPlaceholder: "e.g. Hotie, Piassa, Menhariya, Dessie",
    labelExperience: "Experience Years",
    experiencePlaceholder: "e.g. 5",
    labelDescription: "Description",
    descPlaceholder: "Briefly describe your services and expertise in Dessie",
    termsNoticePrefix: "By creating an account, you agree to Dessie Local's",
    termsNoticeAnd: "and",
    termsNoticeSuffix: ".",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    btnRegisterText: "Create Account",
    btnRegisterLoading: "Creating account...",
    btnLoginText: "Sign In",
    btnLoginLoading: "Signing in...",
    bottomAlreadyText: "Already have an account?",
    bottomSignInLink: "Sign In",
    bottomNoAccountText: "Don't have an account?",
    bottomRegisterLink: "Create Account",
    labelLoginEmail: "Email Address",
    loginEmailPlaceholder: "name@example.com",
    labelLoginPassword: "Password",
    footerCopyright: "© 2024 Dessie Local Service Marketplace. All rights reserved.",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
    footerSupport: "Help & Support",
    successNoticeTitle: "Account created successfully!",
    successNoticeDesc: "Redirecting to your dashboard...",
    loginSuccessNoticeTitle: "Logged in successfully!",
    loginSuccessNoticeDesc: "Welcome back to Dessie Local. Redirecting...",
    logoutSuccessTitle: "Logged out successfully",
    dashboardCustomer: "Customer Dashboard",
    dashboardCustomerSubtitle: "Welcome to your customer portal. Discover verified local service providers, browse offerings, and manage your service requests in Dessie.",
    dashboardProvider: "Provider Dashboard",
    dashboardProviderSubtitle: "Welcome to your provider portal. View your professional profile, verification status, and availability in Dessie.",
    dashboardAdmin: "Admin Dashboard",
    dashboardAdminSubtitle: "Welcome to the administration portal. Oversee platform accounts, provider verifications, and marketplace activity in Dessie.",
    dashboardPlaceholder: "Welcome to your Dessie Local marketplace portal.",
    callProviderBtn: "Call Provider",
    providerPhoneLabel: "Phone",
    statusPendingVerification: "Pending Municipality Verification",
    pendingVerificationNotice: "Your provider account has been registered and is currently pending municipal verification. Once verified by the city administrator, your profile will be published on the public marketplace.",
    labelCvUpload: "Curriculum Vitae (CV / Resume)",
    cvUploadHelp: "Upload your CV in PDF format (Max 5MB). Required for municipal verification.",
    labelCertificateUpload: "Professional Certificate (Optional)",
    certificateUploadHelp: "Upload vocational or trade certificate (PDF, PNG, JPG - Max 5MB)",
    fileSelected: "Selected File",
    btnRemoveFile: "Remove file",
    btnChooseFile: "Choose File",
    btnReplaceFile: "Replace file",
    dragDropText: "Drag and drop your file here, or click to browse",
    errCvInvalidType: "Only PDF files are accepted for CV.",
    errCvTooLarge: "CV file size must not exceed 5MB.",
    errCertificateInvalidType: "Only PDF, JPG, and PNG files are accepted.",
    errCertificateTooLarge: "Certificate file size must not exceed 5MB.",
    uploadingFiles: "Uploading documents...",
    adminProvidersTitle: "Provider Verification Management",
    adminProvidersSubtitle: "Review submitted profiles, inspect candidate CVs, and approve or reject marketplace applications in Dessie.",
    filterAllProviders: "All Providers",
    filterPendingProviders: "Pending Verification",
    filterVerifiedProviders: "Verified",
    filterRejectedProviders: "Rejected",
    colBusiness: "Business / Provider",
    colContact: "Contact Details",
    colExperience: "Experience & Location",
    colDocuments: "Submitted Documents",
    colStatus: "Verification Status",
    colActions: "Actions",
    badgeHasCv: "CV Available (PDF)",
    badgeNoCv: "No CV Submitted",
    badgeHasCert: "Certificate Available",
    badgeNoCert: "No Certificate",
    btnViewCv: "View CV",
    btnViewCertificate: "View Certificate",
    btnApprove: "Approve",
    btnReject: "Reject",
    confirmApproveTitle: "Approve Provider Application?",
    confirmApproveMsg: "This will mark the provider as verified, making their profile visible in the public marketplace for customer bookings.",
    confirmRejectTitle: "Reject Provider Application",
    confirmRejectMsg: "Please provide a reason for rejecting this provider. This explanation will be displayed on the provider's dashboard.",
    rejectionReasonLabel: "Rejection Reason",
    rejectionReasonPlaceholder: "Enter constructive feedback or missing requirements...",
    statusRejected: "Rejected",
    rejectionNoticeTitle: "Application Rejected",
    rejectionNoticeDesc: "Your provider verification was rejected by municipal review for the following reason:",
    reUploadCvBtn: "Upload Updated CV",
    cvUploadedSuccess: "CV uploaded successfully. Your profile is now under review.",
    emptyProviders: "No providers found in this category.",
    loadingDocument: "Loading document...",
    dashWelcome: "Welcome back",
    dashTotalRequests: "Total Requests",
    dashActiveRequests: "Active Jobs",
    dashCompletedRequests: "Completed",
    dashVerifiedPros: "Verified Pros",
    dashRecentRequests: "Recent Service Requests",
    dashNoRequests: "No service requests yet",
    dashNoRequestsSub: "Find trusted local plumbers, electricians, and carpenters across Dessie.",
    dashQuickActions: "Quick Actions",
    dashPopularCategories: "Popular Services in Dessie",
    dashIncomingJobs: "Incoming Job Requests",
    dashNoIncomingJobs: "No incoming job requests yet",
    dashManageServices: "My Offered Services",
    dashAddService: "Add Service",
    dashAvailability: "Availability",
    dashAcceptJob: "Accept Job",
    dashDeclineJob: "Decline",
    dashStartJob: "Start Work",
    dashCompleteJob: "Mark Completed",
    dashboardUser: "User",
    dashboardRole: "Role",
    dashboardEmail: "Email",
    btnLogout: "Logout",
    btnLogoutLoading: "Logging out...",
    navDashboard: "Dashboard",
    navFindService: "Find a Service",
    navMyRequests: "My Requests",
    navProfile: "Profile",
    navSignOut: "Sign Out",
    locationTag: "Dessie, Wollo, Ethiopia",
    findServiceTitle: "Find a Service",
    findServiceSubtitle: "Find local service providers in Dessie.",
    verifiedNetworkPill: "Dessie Verified Network",
    searchPlaceholder: "Search services...",
    searchBtn: "Search",
    pillAllServices: "All Services",
    filterLocationLabel: "Location:",
    filterAvailabilityLabel: "Availability:",
    optAllLocations: "All Locations",
    optAllAvailability: "All Availability",
    optAvailable: "Available",
    optBusy: "Busy",
    optOffline: "Offline",
    showingPrefix: "Showing",
    showingSuffix: "verified providers in Dessie",
    badgeVerified: "Verified",
    btnViewProfile: "View Profile",
    statusAvailable: "Available",
    statusBusy: "Busy",
    statusOffline: "Offline",
    emptyStateTitle: "No service providers found.",
    emptyStateSubtitle: "Try changing your search or filters.",
    emptyResetBtn: "Reset Filters",
    searchResultsFor: "Search results for:",
    searchClearBtn: "Clear search",
    searchNoResultsFound: "Nothing found",
    searchNoResultsDesc: "No service providers found matching your search. Try another keyword or explore popular categories below.",
    errorTitle: "Unable to load service providers.",
    errorSubtitle: "Please try again.",
    errorRetryBtn: "Retry",
    experienceYearsSuffix: "yrs exp",
    findServiceBtn: "Find a Service",
    backToServices: "Back to Find a Service",
    aboutProviderTitle: "About this Provider",
    servicesOfferedTitle: "Services Offered",
    experienceLabel: "Experience",
    yearsExperience: "years experience",
    customerReviewsTitle: "Customer Reviews",
    customerReviewsSubtitle: "Direct feedback from verified homeowners and businesses in Dessie.",
    noReviewsYet: "No reviews yet.",
    noReviewsYetDesc: "Be the first customer to request service and leave verified feedback.",
    requestServiceBtn: "Request Service",
    coordinateRequestTitle: "Coordinate Request",
    coordinateRequestSub: "Direct request coordination with provider upon submission. No advance deposit required.",
    noDescriptionProvided: "No description provided.",
    providerNotFoundTitle: "Provider not found.",
    providerNotFoundDesc: "The requested provider profile does not exist or is no longer available.",
    providerLoading: "Loading provider profile...",
    providerErrorTitle: "Unable to load provider information.",
    providerErrorSubtitle: "Please try again.",
    verifiedProTag: "Verified Local Professional",
    verifiedCustomerTag: "Verified Customer",
    activeSpecialtiesSuffix: "Specialties",
    servicesIntroSub: "Provider offers direct repair, replacement, and installation for the following verified specialties:",
    customerPrivacyNote: "Strict customer privacy protected: Contact numbers and personal identifiers are never publicly published.",

    // Service Request Creation (Step 14)
    requestServicePageTitle: "Request Service",
    requestServiceStepLabel: "Step 1 of 1",
    requestServiceSubtitlePrefix: "Submit your service request to",
    requestServiceSubtitleSuffix: ". The provider will review and respond.",
    backToProviderProfile: "Back to Provider Profile",
    selectedServiceLabel: "Selected Service:",
    serviceLockedHint: "Service category is locked for this provider profile",
    lblWorkDescription: "Description of Work",
    phWorkDescription: "Describe what you need help with (e.g., leaking pipe under kitchen sink, need urgent inspection)...",
    helperWorkDescription: "Be clear and specific so the provider can prepare the necessary tools.",
    lblServiceLocation: "Service Location in Dessie",
    phServiceLocation: "Enter the location where you need the service (e.g., Hotie, House #402, near Post Office)...",
    helperServiceLocation: "Specific street, neighborhood, or building landmark in Dessie.",
    lblRequestedDate: "Requested Date",
    lblRequestedTime: "Requested Time",
    phRequestedTime: "e.g. 10:00 AM",
    reqTag: "Required",
    infoNoticeText: "Your request will be sent directly to the provider with status 'Pending'. No payment is required upon submission.",
    btnSubmitRequest: "Request Service",
    btnSendingRequest: "Sending Request...",
    btnCancel: "Cancel",
    requestLoadingTitle: "Sending Request...",
    requestLoadingSubtitle: "Registering service ticket with the provider.",
    requestSuccessTitle: "Service request sent successfully.",
    requestSuccessDesc: "Your request is now pending provider confirmation.",
    btnViewMyRequests: "View My Requests",
    btnBackToDashboard: "Back to Dashboard",
    refSummaryHeading: "Reference Summary",
    statusPendingTag: "Pending Confirmation",
    errDescRequired: "Description is required",
    errLocRequired: "Location is required",
    errDateRequired: "Requested date is required",
    errTimeRequired: "Requested time is required",
    errSubmissionTitle: "Unable to send your service request.",
    errSubmissionDesc: "Please check your information and try again.",
    btnTryAgain: "Try Again",
    errInvalidProvider: "Invalid provider selected or provider not found.",
    errInvalidService: "Invalid service selected or provider does not offer this service.",
    errProviderNotVerified: "The selected provider is not verified to accept requests.",
    availableForWorkBadge: "Available for Work",
    busyForWorkBadge: "Currently Busy",
    offlineForWorkBadge: "Offline",
    myRequestsPlaceholderTitle: "My Requests",
    myRequestsPlaceholderDesc: "Track the status of your service requests and direct communications with verified providers in Dessie.",

    errors: {
      name: "Please enter your full name.",
      email: "Please enter a valid email address.",
      phone: "Please provide a valid phone number.",
      password: "Password must be at least 8 characters.",
      confirm: "Passwords do not match.",
      business: "Please enter your business name.",
      location: "Please enter your location in Dessie.",
      experience: "Please enter your years of experience.",
      description: "Please provide a brief service description.",
      loginEmail: "Please enter a valid email address.",
      loginPassword: "Please enter your password.",
      genericError: "An unexpected error occurred. Please try again.",
      networkError: "Network connection error. Please ensure the backend is running.",
      invalidCredentials: "The provided credentials do not match our records."
    }
  },
  am: {
    brandTitle: "ደሴ ሎካል",
    brandSubtitle: "የአካባቢ አገልግሎት ገበያ",
    heroTitle: "በደሴ የሚገኙ አስተማማኝ የአገልግሎት ሰጪዎችን ያግኙ።",
    heroIntro: "በደሴ አስተማማኝ አገልግሎት ለማግኘት ወይም የራስዎን አገልግሎት ለመስጠት መለያ ይፍጠሩ።",
    servicesHeading: "የአገልግሎት ዘርፎች",
    services: [
      "የቧንቧ ስራ",
      "የኤሌክትሪክ ስራ",
      "የጽዳት አገልግሎት",
      "ፎቶግራፊ",
      "የኮምፒውተር ጥገና",
      "የማጠናከሪያ ትምህርት",
      "የቀለም ቅብ ስራ",
      "አናጺነት/የእንጨት ስራ"
    ],
    conciseNote: "በደሴ ከሚገኙ የሙያ አገልግሎት ሰጪዎች ጋር ቀጥተኛ ግንኙነት ያድርጉ።",
    leftAlreadyText: "ቀድሞውኑ ተመዝግበዋል?",
    leftSignInLink: "ይግቡ",
    quickTestLabel: "ፈጣን እይታዎች፦",
    quickCustomer: "የደንበኛ ምዝገባ",
    quickProvider: "የአገልግሎት ሰጪ ምዝገባ",
    quickLogin: "መግቢያ",
    tabRegisterText: "መለያ ይፍጠሩ",
    tabLoginText: "ይግቡ",
    formHeaderTitleRegister: "መለያ ይፍጠሩ",
    formHeaderSubtitleRegister: "መድረኩን እንዴት መጠቀም እንደሚፈልጉ ይምረጡ።",
    formHeaderTitleLogin: "እንኳን ደህና መጡ",
    formHeaderSubtitleLogin: "የደሴ ሎካል መለያዎን ለመጠቀም ዝርዝሮችዎን ያስገቡ።",
    roleLabel: "የምፈልገው፦",
    roleCustomerTitle: "አገልግሎት መፈለግ",
    roleCustomerSub: "ለደንበኞች",
    roleProviderTitle: "አገልግሎት መስጠት",
    roleProviderSub: "ለአገልግሎት ሰጪዎች",
    labelName: "ሙሉ ስም",
    namePlaceholder: "ለምሳሌ፦ አልማዝ ታደሰ",
    labelEmail: "የኢሜይል አድራሻ",
    emailPlaceholder: "name@example.com",
    labelPhone: "ስልክ ቁጥር",
    phonePlaceholder: "+251 91 123 4567",
    labelPassword: "የይለፍ ቃል",
    labelConfirmPassword: "የይለፍ ቃል ያረጋግጡ",
    labelBusiness: "የንግድ ወይም የስራ ስም",
    businessPlaceholder: "ለምሳሌ፦ ታደሰ የቧንቧ ስራ መፍትሄዎች",
    labelLocation: "የስራ አድራሻ / ሰፈር በደሴ",
    locationPlaceholder: "ለምሳሌ፦ ሆቴ፣ ፒያሳ፣ መንሃሪያ፣ አራዳ፣ ሮቢት",
    labelExperience: "የስራ ልምድ ዓመታት",
    experiencePlaceholder: "ለምሳሌ፦ 5",
    labelDescription: "የአገልግሎት ዝርዝር መግለጫ",
    descPlaceholder: "በደሴ የሚሰጡትን አገልግሎት እና የስራ ሙያዎን በአጭሩ ይግለጹ",
    termsNoticePrefix: "መለያ በመፍጠር በደሴ ሎካል",
    termsNoticeAnd: "እና",
    termsNoticeSuffix: "ይስማማሉ።",
    termsOfService: "የአገልግሎት ውሎች",
    privacyPolicy: "የግላዊነት ፖሊሲ",
    btnRegisterText: "መለያ ይፍጠሩ",
    btnRegisterLoading: "በመፍጠር ላይ...",
    btnLoginText: "ይግቡ",
    btnLoginLoading: "በመግባት ላይ...",
    bottomAlreadyText: "ቀድሞውኑ መለያ አለዎት?",
    bottomSignInLink: "ይግቡ",
    bottomNoAccountText: "መለያ የለዎትም?",
    bottomRegisterLink: "መለያ ይፍጠሩ",
    labelLoginEmail: "የኢሜይል አድራሻ",
    loginEmailPlaceholder: "name@example.com",
    labelLoginPassword: "የይለፍ ቃል",
    footerCopyright: "© 2024 ደሴ ሎካል የአካባቢ አገልግሎት ገበያ። መብቱ በህግ የተጠበቀ ነው።",
    footerPrivacy: "የግላዊነት ፖሊሲ",
    footerTerms: "የአገልግሎት ውሎች",
    footerSupport: "እገዛ እና ድጋፍ",
    successNoticeTitle: "መለያዎ በተሳካ ሁኔታ ተፈጥሯል!",
    successNoticeDesc: "ወደ ዳሽቦርድዎ በማስተላለፍ ላይ...",
    loginSuccessNoticeTitle: "በተሳካ ሁኔታ ገብተዋል!",
    loginSuccessNoticeDesc: "እንኳን ወደ ደሴ ሎካል በደህና ተመለሱ። በማስተላለፍ ላይ...",
    logoutSuccessTitle: "በተሳካ ሁኔታ ወጥተዋል",
    dashboardCustomer: "የደንበኛ ዳሽቦርድ",
    dashboardCustomerSubtitle: "እንኳን ወደ ደንበኛ ፖርታልዎ በደህና መጡ። በደሴ የተረጋገጡ የአገልግሎት ሰጪዎችን ያግኙ፣ አገልግሎቶችን ያስሱ እና ጥያቄዎችዎን ያስተዳድሩ።",
    dashboardProvider: "የአገልግሎት ሰጪ ዳሽቦርድ",
    dashboardProviderSubtitle: "እንኳን ወደ አገልግሎት ሰጪ ፖርታልዎ በደህና መጡ። በደሴ የሚገኘውን የሙያ መገለጫዎን፣ የማረጋገጫ ሁኔታዎን እና ተገኝነትዎን ይመልከቱ።",
    dashboardAdmin: "የአስተዳዳሪ ዳሽቦርድ",
    dashboardAdminSubtitle: "እንኳን ወደ አስተዳዳሪ ፖርታል በደህና መጡ። የመለያዎችን ሁኔታ፣ የአቅራቢዎችን ማረጋገጫ እና የገበያ እንቅስቃሴዎችን በደሴ ይቆጣጠሩ።",
    dashboardPlaceholder: "እንኳን ወደ ደሴ የአካባቢ አገልግሎት ገበያ ፖርታል በደህና መጡ።",
    callProviderBtn: "አቅራቢውን ይደውሉ",
    providerPhoneLabel: "ስልክ ቁጥር",
    statusPendingVerification: "የማዘጋጃ ቤት ማረጋገጫ በመጠባበቅ ላይ",
    pendingVerificationNotice: "የአቅራቢ መለያዎ ተመዝግቧል፤ በአሁኑ ጊዜ የማዘጋጃ ቤት ማረጋገጫ በመጠባበቅ ላይ ይገኛል። በከተማው አስተዳዳሪ ሲረጋገጥ መገለጫዎ በይፋዊው የገበያ ቦታ ላይ ይታያል።",
    labelCvUpload: "የግል የትምህርትና የሥራ ልምድ ማስረጃ (ሲቪ)",
    cvUploadHelp: "ሲቪዎን በፒዲኤፍ (PDF) ቅርጸት ይስቀሉ (እስከ 5ሜባ)። ለማዘጋጃ ቤት ማረጋገጫ ያስፈልጋል።",
    labelCertificateUpload: "የሙያ ማረጋገጫ ሰርተፍኬት (አማራጭ)",
    certificateUploadHelp: "የሙያ ወይም የንግድ ምስክር ወረቀት ይስቀሉ (PDF, PNG, JPG - እስከ 5ሜባ)",
    fileSelected: "የተመረጠ ፋይል",
    btnRemoveFile: "ፋይሉን አስወግድ",
    btnChooseFile: "ፋይል ይምረጡ",
    btnReplaceFile: "ፋይል ቀይር",
    dragDropText: "ፋይልዎን እዚህ ይጎትቱ ወይም ለመምረጥ ጠቅ ያድርጉ",
    errCvInvalidType: "ለሲቪ የፒዲኤፍ (PDF) ፋይሎች ብቻ ተቀባይነት አላቸው።",
    errCvTooLarge: "የሲቪ ፋይል መጠን ከ5 ሜጋባይት መብለጥ የለበትም።",
    errCertificateInvalidType: "PDF፣ JPG እና PNG ፋይሎች ብቻ ተቀባይነት አላቸው።",
    errCertificateTooLarge: "የሰርተፍኬት ፋይል መጠን ከ5 ሜጋባይት መብለጥ የለበትም።",
    uploadingFiles: "ሰነዶችን በመጫን ላይ...",
    adminProvidersTitle: "የአገልግሎት ሰጪዎች ማረጋገጫ አስተዳደር",
    adminProvidersSubtitle: "የቀረቡ መገለጫዎችን ይገምግሙ፣ የሲቪ ሰነዶችን ይመልከቱ፣ እና በደሴ የገበያ ቦታ ላይ ማረጋገጫ ይስጡ ወይም ውድቅ ያድርጉ።",
    filterAllProviders: "ሁሉም አቅራቢዎች",
    filterPendingProviders: "ማረጋገጫ በመጠባበቅ ላይ",
    filterVerifiedProviders: "የተረጋገጡ",
    filterRejectedProviders: "ውድቅ የተደረጉ",
    colBusiness: "ንግድ / አገልግሎት ሰጪ",
    colContact: "የአድራሻ መረጃ",
    colExperience: "ልምድ እና ቦታ",
    colDocuments: "የቀረቡ ሰነዶች",
    colStatus: "የማረጋገጫ ሁኔታ",
    colActions: "እርምጃዎች",
    badgeHasCv: "ሲቪ አለ (PDF)",
    badgeNoCv: "ምንም ሲቪ አልቀረበም",
    badgeHasCert: "ሰርተፍኬት አለ",
    badgeNoCert: "ምንም ሰርተፍኬት የለም",
    btnViewCv: "ሲቪ ይመልከቱ",
    btnViewCertificate: "ሰርተፍኬት ይመልከቱ",
    btnApprove: "አጽድቅ",
    btnReject: "ውድቅ አድርግ",
    confirmApproveTitle: "የአገልግሎት ሰጪውን ማመልከቻ ማጽደቅ ይፈልጋሉ?",
    confirmApproveMsg: "ይህ አቅራቢውን እንደተረጋገጠ ምልክት ያደርጋል፣ እና መገለጫቸው በይፋዊው የገበያ ቦታ ለደንበኞች እንዲታይ ያደርጋል።",
    confirmRejectTitle: "የአገልግሎት ሰጪውን ማመልከቻ ውድቅ አድርግ",
    confirmRejectMsg: "እባክዎ ይህንን አቅራቢ ውድቅ ለማድረግ ምክንያቱን ይግለጹ። ይህ ማብራሪያ በአቅራቢው ዳሽቦርድ ላይ ይታያል።",
    rejectionReasonLabel: "ውድቅ የተደረገበት ምክንያት",
    rejectionReasonPlaceholder: "ገንቢ አስተያየት ወይም ያልተሟሉ መስፈርቶችን ያስገቡ...",
    statusRejected: "ውድቅ የተደረገ",
    rejectionNoticeTitle: "ማመልከቻው ውድቅ ተደርጓል",
    rejectionNoticeDesc: "የአቅራቢነት ማረጋገጫዎ በማዘጋጃ ቤት ግምገማ በሚከተለው ምክንያት ውድቅ ተደርጓል:",
    reUploadCvBtn: "የተሻሻለ ሲቪ ይስቀሉ",
    cvUploadedSuccess: "ሲቪ በተሳካ ሁኔታ ተጭኗል። መገለጫዎ አሁን በድጋሚ በግምገማ ላይ ነው።",
    emptyProviders: "በዚህ ምድብ ውስጥ ምንም አቅራቢ አልተገኘም።",
    loadingDocument: "ሰነድ በመጫን ላይ...",
    dashWelcome: "እንኳን ደህና መጡ",
    dashTotalRequests: "ጠቅላላ ጥያቄዎች",
    dashActiveRequests: "በሂደት ላይ ያሉ",
    dashCompletedRequests: "የተጠናቀቁ",
    dashVerifiedPros: "የተረጋገጡ ባለሙያዎች",
    dashRecentRequests: "የቅርብ ጊዜ የአገልግሎት ጥያቄዎች",
    dashNoRequests: "እስካሁን ምንም የአገልግሎት ጥያቄዎች የሉም",
    dashNoRequestsSub: "በደሴ ውስጥ የታመኑ የቧንቧ፣ የኤሌክትሪክ እና የአናጺ ባለሙያዎችን ያግኙ።",
    dashQuickActions: "ፈጣን እርምጃዎች",
    dashPopularCategories: "በደሴ ተወዳጅ አገልግሎቶች",
    dashIncomingJobs: "የገቡ የስራ ጥያቄዎች",
    dashNoIncomingJobs: "እስካሁን ምንም አዲስ የስራ ጥያቄዎች የሉም",
    dashManageServices: "የማቀርባቸው አገልግሎቶች",
    dashAddService: "አገልግሎት ጨምር",
    dashAvailability: "የስራ ዝግጁነት",
    dashAcceptJob: "ስራውን ተቀበል",
    dashDeclineJob: "አትቀበል",
    dashStartJob: "ስራ ጀምር",
    dashCompleteJob: "ስራውን አጠናቅቅ",
    dashboardUser: "ተጠቃሚ",
    dashboardRole: "ሚና",
    dashboardEmail: "ኢሜይል",
    btnLogout: "ውጣ",
    btnLogoutLoading: "በመውጣት ላይ...",
    navDashboard: "ዳሽቦርድ",
    navFindService: "አገልግሎት ይፈልጉ",
    navMyRequests: "ጥያቄዎቼ",
    navProfile: "መገለጫ",
    navSignOut: "ውጣ",
    locationTag: "ደሴ፣ ወሎ፣ ኢትዮጵያ",
    findServiceTitle: "አገልግሎት ይፈልጉ",
    findServiceSubtitle: "በደሴ የሚገኙ የአገልግሎት ሰጪዎችን ያግኙ።",
    verifiedNetworkPill: "የደሴ የተረጋገጠ አውታረ መረብ",
    searchPlaceholder: "አገልግሎቶችን ይፈልጉ...",
    searchBtn: "ፈልግ",
    pillAllServices: "ሁሉም አገልግሎቶች",
    filterLocationLabel: "አካባቢ:",
    filterAvailabilityLabel: "ተገኝነት:",
    optAllLocations: "ሁሉም አካባቢዎች",
    optAllAvailability: "ሁሉም ተገኝነት",
    optAvailable: "ዝግጁ",
    optBusy: "በስራ ላይ",
    optOffline: "ከመስመር ውጭ",
    showingPrefix: "በደሴ",
    showingSuffix: "የተረጋገጡ አቅራቢዎች ተገኝተዋል",
    badgeVerified: "የተረጋገጠ",
    btnViewProfile: "መገለጫ ይመልከቱ",
    statusAvailable: "ዝግጁ",
    statusBusy: "በስራ ላይ",
    statusOffline: "ከመስመር ውጭ",
    emptyStateTitle: "ምንም አገልግሎት ሰጪ አልተገኘም።",
    emptyStateSubtitle: "እባክዎ የፍለጋ ቃላትን ወይም ማጣሪያዎችን ይቀይሩ።",
    emptyResetBtn: "ማጣሪያዎችን ዳግም አስጀምር",
    searchResultsFor: "የፍለጋ ውጤቶች ለ፡",
    searchClearBtn: "ፍለጋውን አጽዳ",
    searchNoResultsFound: "ምንም አልተገኘም",
    searchNoResultsDesc: "ለፍለጋዎ የሚስማማ አገልግሎት ሰጪ አልተገኘም። እባክዎ ሌላ ቃል ይሞክሩ ወይም ከታች ያሉትን ታዋቂ ምድቦች ይመልከቱ።",
    errorTitle: "አገልግሎት ሰጪዎችን መጫን አልተቻለም።",
    errorSubtitle: "እባክዎ እንደገና ይሞክሩ።",
    errorRetryBtn: "እንደገና ሞክር",
    experienceYearsSuffix: "ዓመት ልምድ",
    findServiceBtn: "አገልግሎት ይፈልጉ",
    backToServices: "ወደ አገልግሎት ፍለጋ ተመለስ",
    aboutProviderTitle: "ስለ አገልግሎት ሰጪው",
    servicesOfferedTitle: "የሚሰጡ አገልግሎቶች",
    experienceLabel: "የስራ ልምድ",
    yearsExperience: "ዓመት የስራ ልምድ",
    customerReviewsTitle: "የደንበኞች አስተያየት",
    customerReviewsSubtitle: "በደሴ ከሚገኙ የተረጋገጡ ደንበኞች የተሰጡ አስተያየቶች።",
    noReviewsYet: "እስካሁን ግምገማ የለም።",
    noReviewsYetDesc: "የመጀመሪያው አገልግሎት ጠያቂ በመሆን የተረጋገጠ አስተያየትዎን ይስጡ።",
    requestServiceBtn: "አገልግሎት ይጠይቁ",
    coordinateRequestTitle: "አገልግሎት ያቀናጁ",
    coordinateRequestSub: "ጥያቄዎ እንደደረሰ በቀጥታ ከአገልግሎት ሰጪው ጋር ይገናኛሉ። ምንም ዓይነት ቅድመ ክፍያ አይጠየቅም።",
    noDescriptionProvided: "ምንም መግለጫ አልተሰጠም።",
    providerNotFoundTitle: "አገልግሎት ሰጪው አልተገኘም።",
    providerNotFoundDesc: "የተጠየቀው አገልግሎት ሰጪ መገለጫ አልተገኘም ወይም ከአሁን በኋላ አይገኝም።",
    providerLoading: "የአገልግሎት ሰጪውን መረጃ በመጫን ላይ...",
    providerErrorTitle: "የአገልግሎት ሰጪውን መረጃ መጫን አልተቻለም።",
    providerErrorSubtitle: "እባክዎ እንደገና ይሞክሩ።",
    verifiedProTag: "ደሴ የተረጋገጠ ባለሙያ",
    verifiedCustomerTag: "የተረጋገጠ ደንበኛ",
    activeSpecialtiesSuffix: "ሙያዎች",
    servicesIntroSub: "አገልግሎት ሰጪው በሚከተሉት የተረጋገጡ የስራ ዘርፎች ቀጥተኛ አገልግሎት ይሰጣል፦",
    customerPrivacyNote: "የደንበኞች ግላዊነት በጥብቅ የተጠበቀ ነው፦ የስልክ ቁጥር እና የግል መረጃዎች ለህዝብ ይፋ አይደረጉም።",

    // Service Request Creation (Step 14)
    requestServicePageTitle: "አገልግሎት ይጠይቁ",
    requestServiceStepLabel: "ደረጃ 1 ከ 1",
    requestServiceSubtitlePrefix: "የአገልግሎት ጥያቄዎን ለ",
    requestServiceSubtitleSuffix: " ያስገቡ። አገልግሎት ሰጪው ገምግሞ ምላሽ ይሰጣል።",
    backToProviderProfile: "ወደ አገልግሎት ሰጪው ገጽ ተመለስ",
    selectedServiceLabel: "የተመረጠው አገልግሎት:",
    serviceLockedHint: "የአገልግሎት ዘርፍ ለዚህ ባለሙያ ተቆልፏል",
    lblWorkDescription: "የሥራው ዝርዝር",
    phWorkDescription: "ምን ዓይነት እርዳታ እንደሚፈልጉ ይግለጹ (ለምሳሌ፡ በኩሽና ውስጥ የተሰበረ የቧንቧ መስመር፣ አስቸኳይ ፍተሻ ያስፈልጋል)...",
    helperWorkDescription: "አገልግሎት ሰጪው ተገቢውን ዕቃ እንዲያዘጋጅ ግልጽ እና ዝርዝር መረጃ ይስጡ።",
    lblServiceLocation: "የአገልግሎት ቦታ (ደሴ)",
    phServiceLocation: "አገልግሎቱን የሚፈልጉበትን ትክክለኛ ቦታ ይግለጹ (ለምሳሌ፡ ሆቴ፣ የቤት ቁጥር 402፣ ፖስታ ቤት አጠገብ)...",
    helperServiceLocation: "በደሴ ከተማ ውስጥ ያለ ትክክለኛ መንደር፣ ቀበሌ ወይም ታዋቂ ምልክት።",
    lblRequestedDate: "የተጠየቀው ቀን",
    lblRequestedTime: "የተጠየቀው ሰዓት",
    phRequestedTime: "ለምሳሌ፡ 10:00 AM",
    reqTag: "አስፈላጊ",
    infoNoticeText: "ጥያቄዎ በቀጥታ 'በመጠባበቅ ላይ' (Pending) በሚል ሁኔታ ለአገልግሎት ሰጪው ይላካል። በሚያስገቡበት ጊዜ ምንም ዓይነት ክፍያ አይጠየቅም።",
    btnSubmitRequest: "አገልግሎት ይጠይቁ",
    btnSendingRequest: "ጥያቄው በመላክ ላይ...",
    btnCancel: "ሰርዝ",
    requestLoadingTitle: "ጥያቄው በመላክ ላይ...",
    requestLoadingSubtitle: "ጥያቄዎ ለአገልግሎት ሰጪው በመመዝገብ ላይ ይገኛል።",
    requestSuccessTitle: "የአገልግሎት ጥያቄዎ በተሳካ ሁኔታ ተልኳል።",
    requestSuccessDesc: "ጥያቄዎ አሁን የአገልግሎት ሰጪውን ማረጋገጫ እየጠበቀ ነው።",
    btnViewMyRequests: "ጥያቄዎቼን ይመልከቱ",
    btnBackToDashboard: "ወደ ዳሽቦርድ ተመለስ",
    refSummaryHeading: "የማጣቀሻ ማጠቃለያ",
    statusPendingTag: "ማረጋገጫ በመጠባበቅ ላይ",
    errDescRequired: "የሥራው ዝርዝር መገለጽ አለበት",
    errLocRequired: "የአገልግሎት ቦታ መገለጽ አለበት",
    errDateRequired: "የተጠየቀው ቀን ያስፈልጋል",
    errTimeRequired: "የተጠየቀው ሰዓት ያስፈልጋል",
    errSubmissionTitle: "የአገልግሎት ጥያቄዎን መላክ አልተቻለም።",
    errSubmissionDesc: "እባክዎ መረጃዎን አረጋግጠው እንደገና ይሞክሩ።",
    btnTryAgain: "እንደገና ይሞክሩ",
    errInvalidProvider: "የተመረጠው አገልግሎት ሰጪ ልክ አይደለም ወይም አልተገኘም።",
    errInvalidService: "የተመረጠው አገልግሎት ልክ አይደለም ወይም አገልግሎት ሰጪው ይህንን አገልግሎት አይሰጥም።",
    errProviderNotVerified: "የተመረጠው አገልግሎት ሰጪ ጥያቄዎችን ለመቀበል አልተረጋገጠም።",
    availableForWorkBadge: "ለሥራ ዝግጁ",
    busyForWorkBadge: "በሥራ ላይ",
    offlineForWorkBadge: "ከመስመር ውጭ",
    myRequestsPlaceholderTitle: "የእኔ ጥያቄዎች",
    myRequestsPlaceholderDesc: "የአገልግሎት ጥያቄዎችዎን ሁኔታ እና በደሴ ከሚገኙ የተረጋገጡ አቅራቢዎች ጋር ቀጥተኛ ግንኙነቶችን ይከታተሉ።",

    errors: {
      name: "እባክዎ ሙሉ ስምዎን ያስገቡ።",
      email: "እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ።",
      phone: "እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።",
      password: "የይለፍ ቃል ቢያንስ 8 ፊደላት/ቁጥሮች መሆን አለበት።",
      confirm: "የይለፍ ቃሎቹ አይመሳሰሉም።",
      business: "እባክዎ የንግድ ወይም የሙያ ስምዎን ያስገቡ።",
      location: "እባክዎ በደሴ ያለዎትን አድራሻ ያስገቡ።",
      experience: "እባክዎ የስራ ልምድዎን ያስገቡ።",
      description: "እባክዎ አጭር የአገልግሎት መግለጫ ያስገቡ።",
      loginEmail: "እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ።",
      loginPassword: "እባክዎ የይለፍ ቃልዎን ያስገቡ።",
      genericError: "ያልተጠበቀ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።",
      networkError: "የኔትወርክ ግንኙነት ስህተት። እባክዎ ሰርቨሩ እየሰራ መሆኑን ያረጋግጡ።",
      invalidCredentials: "ያስገቡት የኢሜይል ወይም የይለፍ ቃል ልክ አይደለም።"
    }
  }
};
